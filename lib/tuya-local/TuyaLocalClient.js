const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');
'use strict';

const TuyAPI = require('tuyapi');
const { EventEmitter } = require('events');

const PROTOCOL_VERSIONS = ['3.3', '3.4', '3.5', '3.2', '3.1'];

class TuyaLocalClient extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id = opts.id;
    this.key = opts.key;
    this.ip = opts.ip || null;
    this.version = opts.version || '3.3';
    this._autoDetectProtocol = opts.autoDetectProtocol !== false;
    this._resolveIP = opts.resolveIP || null;
    this._connected = false;
    this._connecting = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 5000;
    this._maxReconnectDelay = 60000;
    this._destroyed = false;
    this._device = null;
    this._lastDps = {};
    this._heartbeatTimer = null;
    this._heartbeatInterval = opts.heartbeatInterval || 15000;
    this._missedHeartbeats = 0;
    this._maxMissedHeartbeats = 3;
    this._log = opts.log || (() => {});
    this._connectAttempts = 0;
    this._protocolAttemptIdx = 0;
    this._commandQueue = [];
    this._commandBusy = false;
    this._minCommandInterval = 200;
    this._commandTimeout = opts.commandTimeout || 10000; // v9.0.40: 10s command timeout
    this._lastCommandTime = 0;

    // v9.0.40: Structured retry parameters matching TinyTuya's proven model
    this._retryConfig = {
      connectionTimeout: opts.connectionTimeout || 5000,       // 5s per attempt
      connectionRetryLimit: opts.connectionRetryLimit || 5,    // max 5 attempts
      connectionRetryDelay: opts.connectionRetryDelay || 5000, // 5s between attempts
      totalTimeout: opts.totalTimeout || 45000,                // 45s total window
    };
    this._connectionStartTime = null; // Tracks total connection window

    // v9.0.40: Connection state tracking
    this._connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'reconnecting'
    this._lastDisconnectReason = null;
    this._totalReconnects = 0;
    this._offlineCommandQueue = []; // Commands queued while offline
    this._offlineCommandLimit = 50; // Max queued offline commands
  }

  get connected() { return this._connected; }
  get connectionState() { return this._connectionState; }
  get lastDps() { return { ...this._lastDps }; }
  get offlineQueueSize() { return this._offlineCommandQueue.length; }

  async connect() {
    if (this._destroyed || this._connecting) {return;}

    // v9.0.40: Enforce total connection timeout window
    if (!this._connectionStartTime) {
      this._connectionStartTime = Date.now();
    }
    const elapsed = Date.now() - this._connectionStartTime;
    if (elapsed >= this._retryConfig.totalTimeout) {
      this._log(`[TUYA-TCP] Total connection window (${this._retryConfig.totalTimeout}ms) exhausted after ${elapsed}ms`);
      this._connectionStartTime = null;
      this.emit('connection-timeout');
      return;
    }

    // v9.0.40: Enforce retry limit
    if (this._connectAttempts >= this._retryConfig.connectionRetryLimit) {
      this._log(`[TUYA-TCP] Connection retry limit (${this._retryConfig.connectionRetryLimit}) reached`);
      this._connectionStartTime = null;
      this.emit('connection-timeout');
      return;
    }

    this._connecting = true;
    this._connectionState = 'connecting';
    this.emit('connection-state', this._connectionState);
    this._clearReconnect();
    this._stopHeartbeat();
    try {
      if (this._device) {
        try { this._device.removeAllListeners(); await this._device.disconnect(); } catch (e) { this._log('[TUYA-TCP] Cleanup before reconnect:', e.message); }
        this._device = null;
      }
      
      // Dynamic IP self-healing: query injected resolver (decoupled from Homey app structure)
      if (typeof this._resolveIP === 'function') {
        const discoveredIp = this._resolveIP(this.id);
        if (discoveredIp && discoveredIp !== this.ip) {
          this._log(`[TUYA-TCP] Dynamic IP auto-corrected via background cache: ${this.ip} -> ${discoveredIp}`);
          this.ip = discoveredIp;
          this.emit('ip-resolved', this.ip);
        }
      }

      const config = { id: this.id, key: this.key, version: this.version, issueRefreshOnConnect: true };
      // If we failed multiple times with the cached IP, bypass it to force find() scan on LAN
      const useCachedIP = this.ip && this._connectAttempts <= 2;
      if (useCachedIP) {config.ip = this.ip;}
      
      this._device = new TuyAPI(config);
      this._setupListeners();
      this._connectAttempts++;
      if (!config.ip) {
        this._log('[TUYA-TCP] Stale or missing IP address, scanning local network for device...');
        await this._device.find({ timeout: 10000 });
      }
      await this._device.connect();
    } catch (err) {
      this._connecting = false;
      const msg = err.message || '';
      const isAuth = msg.includes('key') || msg.includes('cipher') || msg.includes('decrypt') || msg.includes('session');
      if (isAuth && this._autoDetectProtocol && this._protocolAttemptIdx < PROTOCOL_VERSIONS.length - 1) {
        this._protocolAttemptIdx++;
        this.version = PROTOCOL_VERSIONS[this._protocolAttemptIdx];
        this._log(`[TUYA-TCP] Trying protocol v${  this.version}`);
        return this.connect();
      } else if (isAuth) {
        this._log('[TUYA-TCP] AUTH ERROR');
        this.emit('auth-error', err);
      } else {
        this._log(`[TUYA-TCP] Connect failed (attempt ${  this._connectAttempts  }):`, err.message);
        this.emit('error', err);
      }
      this._scheduleReconnect();
    }
  }

  _setupListeners() {
    const d = this._device;
    d.on('connected', () => {
      this._connected = true;
      this._connecting = false;
      this._connectionState = 'connected';
      this._reconnectDelay = 5000;
      this._connectAttempts = 0;
      this._protocolAttemptIdx = 0;
      this._connectionStartTime = null; // v9.0.40: Reset total window on success
      this._missedHeartbeats = 0;
      this._startHeartbeat();
      // Auto-correct IP address if dynamic lookup found a new one
      const resolvedIp = d.device && d.device.ip;
      if (resolvedIp && resolvedIp !== this.ip) {
        this._log(`[TUYA-TCP] IP address auto-corrected from ${  this.ip  } to ${  resolvedIp}`);
        this.ip = resolvedIp;
        this.emit('ip-resolved', resolvedIp);
      }
      this._log(`[TUYA-TCP] Connected to ${  this.ip || 'auto-discovered IP'} (using protocol v${this.version})`);
      this.emit('version-resolved', this.version);
      this.emit('connected');
      this.emit('connection-state', this._connectionState);

      // v9.0.40: Flush offline command queue on reconnect
      this._flushOfflineQueue();
    });
    d.on('disconnected', () => {
      this._connected = false;
      this._connectionState = 'disconnected';
      this._lastDisconnectReason = 'transport-disconnect';
      this._stopHeartbeat();
      this._log('[TUYA-TCP] Disconnected');
      this.emit('disconnected');
      this.emit('connection-state', this._connectionState);
      if (!this._destroyed) {this._scheduleReconnect();}
    });
    d.on('data', (data) => {
      this._missedHeartbeats = 0;
      if (data && data.dps) {
        Object.assign(this._lastDps, data.dps);
        this.emit('dp-update', data.dps);
      }
    });
    d.on('dp-refresh', (data) => {
      this._missedHeartbeats = 0;
      if (data && data.dps) {
        Object.assign(this._lastDps, data.dps);
        this.emit('dp-update', data.dps);
      }
    });
    d.on('heartbeat', () => { this._missedHeartbeats = 0; });
    d.on('error', (err) => {
      this._log('[TUYA-TCP] Error:', err.message);
      this.emit('error', err);
    });
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    // Use native timers: this transport helper is not a Homey object.
    this._heartbeatTimer = globalThis.setInterval(() => {
      if (this._destroyed) return;
      if (!this._connected || !this._device) {return;}
      this._missedHeartbeats++;
      if (this._missedHeartbeats >= this._maxMissedHeartbeats) {
        this._log(`[TUYA-TCP] Heartbeat timeout (${  this._missedHeartbeats  } missed), reconnecting...`);
        this._connected = false;
        this._stopHeartbeat();
        try { this._device.disconnect(); } catch (e) { this._log('[TUYA-TCP] Disconnect on heartbeat timeout:', e.message); }
        this._scheduleReconnect();
        return;
      }
      try { this._device.refresh({ schema: true }); } catch (e) { this._log('[TUYA-TCP] Heartbeat refresh failed:', e.message); }
    }, this._heartbeatInterval);
    this._heartbeatTimer.unref?.();
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }

  async setDP(dp, value) {
    // v9.0.40: Queue command for retry when offline
    if (!this._connected && !this._destroyed) {
      return this._queueOfflineCommand({ type: 'set', dp, value });
    }
    return this._enqueue(() => {
      if (!this._device || !this._connected) {throw new Error('Not connected');}
      return this._device.set({ dps: dp, set: value });
    });
  }

  async setDPs(dpsObj) {
    // v9.0.40: Queue command for retry when offline
    if (!this._connected && !this._destroyed) {
      return this._queueOfflineCommand({ type: 'setMultiple', dps: dpsObj });
    }
    return this._enqueue(() => {
      if (!this._device || !this._connected) {throw new Error('Not connected');}
      return this._device.set({ multiple: true, data: dpsObj });
    });
  }

  async getDP(dp) {
    return this._enqueue(() => {
      if (!this._device || !this._connected) {throw new Error('Not connected');}
      return this._device.get({ dps: dp });
    });
  }

  async refresh() {
    if (!this._device || !this._connected) {return;}
    try { await this._device.refresh({ schema: true }); } catch (e) { this._log('[TUYA-TCP] Schema refresh failed:', e.message); }
  }

  _enqueue(fn) {
    return new Promise((resolve, reject) => {
      this._commandQueue.push({ fn, resolve, reject, retries: 0 });
      if (!this._commandBusy) {this._processQueue();}
    });
  }

  async _processQueue() {
    if (this._commandBusy || this._commandQueue.length === 0) {return;}
    this._commandBusy = true;
    const cmd = this._commandQueue.shift();
    const now = Date.now();
    const wait = this._minCommandInterval - (now - this._lastCommandTime);
    if (wait > 0) {await new Promise((r) => safeSetTimeout(r, wait));}
    try {
      // v9.0.40: Command timeout to prevent queue stall
      const result = await this._withTimeout(cmd.fn(), this._commandTimeout, 'Command timeout');
      this._lastCommandTime = Date.now();
      cmd.resolve(result);
    } catch (err) {
      const retriable = err.message && (err.message.includes('timeout') || err.message.includes('EPIPE') || err.message.includes('ECONNRESET'));
      if (retriable && cmd.retries < 2 && this._connected) {
        cmd.retries++;
        this._log(`[TUYA-TCP] Retry ${  cmd.retries  }/2: ${  err.message}`);
        this._commandQueue.unshift(cmd);
      } else {
        cmd.reject(err);
      }
    }
    this._commandBusy = false;
    if (this._commandQueue.length > 0) {this._processQueue();}
  }

  /**
   * v9.0.40: Queue a command for execution when connection is restored
   * @param {object} cmd - Command object { type, dp, value, dps }
   * @returns {Promise} Resolves when command is eventually sent
   */
  _queueOfflineCommand(cmd) {
    if (this._offlineCommandQueue.length >= this._offlineCommandLimit) {
      // Drop oldest command to prevent unbounded growth
      const dropped = this._offlineCommandQueue.shift();
      this._log(`[TUYA-TCP] Offline queue full, dropping oldest command (dp=${dropped.dp})`);
    }
    return new Promise((resolve, reject) => {
      this._offlineCommandQueue.push({ ...cmd, resolve, reject, timestamp: Date.now() });
      this._log(`[TUYA-TCP] Command queued offline (dp=${cmd.dp || 'multi'}, queue=${this._offlineCommandQueue.length})`);
    });
  }

  /**
   * v9.0.40: Flush offline command queue after reconnection
   */
  async _flushOfflineQueue() {
    if (this._offlineCommandQueue.length === 0) return;
    const queued = this._offlineCommandQueue.splice(0);
    this._log(`[TUYA-TCP] Flushing ${queued.length} queued offline commands...`);
    for (const cmd of queued) {
      // Skip commands older than 5 minutes (stale)
      if (Date.now() - cmd.timestamp > 300000) {
        cmd.reject(new Error('Offline command expired (>5min)'));
        continue;
      }
      try {
        if (cmd.type === 'set') {
          await this.setDP(cmd.dp, cmd.value);
        } else if (cmd.type === 'setMultiple') {
          await this.setDPs(cmd.dps);
        }
        cmd.resolve();
      } catch (err) {
        cmd.reject(err);
      }
    }
  }

  _scheduleReconnect() {
    if (this._destroyed || this._reconnectTimer) {return;}
    this._connectionState = 'reconnecting';
    this._totalReconnects++;
    this.emit('connection-state', this._connectionState);
    const delay = Math.min(this._reconnectDelay, this._maxReconnectDelay);
    this._log(`[TUYA-TCP] Reconnecting in ${  delay / 1000  }s... (attempt ${this._totalReconnects})`);
    this._reconnectTimer = safeSetTimeout(async () => {
      if (this._destroyed) return;
      this._reconnectTimer = null;
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay);
      await this.connect();
    }, delay);
    this._reconnectTimer.unref?.();
  }

  _clearReconnect() {
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
  }

  updateKey(newKey) {
    this.key = newKey;
    this._log('[TUYA-TCP] Local key updated, will use on next connect');
  }

  updateIP(newIP) {
    this.ip = newIP;
    this._log(`[TUYA-TCP] IP updated to ${  newIP}`);
  }

  async disconnect() {
    this._clearReconnect();
    this._stopHeartbeat();
    if (this._destroyed) {
      this._flushQueue('Disconnected permanently');
    }
    if (this._device && this._connected) {
      try { await this._device.disconnect(); } catch (e) { this._log('[TUYA-TCP] Final disconnect cleanup:', e.message); }
    }
    this._connected = false;
  }

  _flushQueue(reason) {
    while (this._commandQueue.length > 0) {
      const cmd = this._commandQueue.shift();
      cmd.reject(new Error(reason));
    }
    this._commandBusy = false;
  }

  _withTimeout(promise, timeoutMs, message) {
    let timer = null;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = safeSetTimeout(() => {
          reject(new Error(this._destroyed ? 'Device destroyed' : message));
        }, timeoutMs);
        timer.unref?.();
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async destroy() {
    this._destroyed = true;
    this._flushQueue('Device destroyed');
    await this.disconnect();
    if (this._device) { this._device.removeAllListeners(); this._device = null; }
    this.removeAllListeners();
  }
}

module.exports = TuyaLocalClient;
