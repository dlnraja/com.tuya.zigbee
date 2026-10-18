'use strict';

const { safeSetTimeout, safeClearTimeout, safeSetInterval, safeClearInterval } = require('../utils/safe-timers');
const TuyAPI = require('tuyapi');
const { EventEmitter } = require('events');
const {
  PROTOCOL_VERSIONS,
  buildProtocolFallbackChain,
  normalizeLocalKey,
} = require('./UdpDiscoveryKeys');
const { computeReconnectDelay } = require('./TuyaReconnectPolicy');
const { runProbes } = require('./TuyaDpDetector');

class TuyaLocalClient extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id = opts.id;
    this.key = normalizeLocalKey(opts.key) || opts.key;
    this.ip = opts.ip || null;
    const isAuto = !opts.version || opts.version === 'auto';
    const preferred = opts.preferredVersion
      || (!isAuto ? opts.version : null)
      || '3.3';
    this._protocolChain = buildProtocolFallbackChain(preferred);
    this._protocolAttemptIdx = 0;
    this.version = this._protocolChain[0] || preferred || '3.3';
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
    this._commandQueue = [];
    this._commandBusy = false;
    // P2619: default 100 ms (com.tuyalocal); override via setCommandGap / settings
    this._minCommandInterval = opts.minCommandInterval != null
      ? Number(opts.minCommandInterval)
      : 100;
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

    // P2641: stale-data watchdog (andiwirz/com.tuyalocal) — HB can stay alive while DPS die
    this._lastDpsAt = 0;
    this._dataTimeoutMs = 0; // 0 = disabled (push-only / poll interval 0)
    this._dataWatchdogTimer = null;
    this._answersPolls = false;
    this._pollIntervalMs = opts.pollIntervalMs != null ? Number(opts.pollIntervalMs) : 30000;
    // P2642: device-level fire-and-forget (3.4/3.5 / pulse relays)
    this._fireAndForget = opts.fireAndForget === true;
    // P2700 (Tuya Local thread 154077 #328/#337, Andi): a TCP accept is not proof of the
    // right protocol — a 3.4 device accepts a 3.3 socket then resets it. The session counts
    // as confirmed only once real DPS arrive; early drops before that feed protocol rotation.
    this._lockProtocol = opts.lockProtocol === true;
    this._sessionConfirmed = false;
    this._connectedAt = 0;
    this._earlyDrops = 0;
    this._earlyDropWindowMs = 10000;
    this._earlyDropsBeforeRotate = 2;
    if (this._pollIntervalMs > 0) {
      this.setDataTimeout(this._pollIntervalMs);
    }
  }

  get connected() { return this._connected; }
  get connectionState() { return this._connectionState; }
  get lastDps() { return { ...this._lastDps }; }
  get offlineQueueSize() { return this._offlineCommandQueue.length; }

  /**
   * P2619: Minimum gap between two SET/GET commands (ms).
   * Contre quoi: firmware that accepts the first of a rapid pair and silently drops the second.
   */
  setCommandGap(ms) {
    const n = Number(ms);
    this._minCommandInterval = Number.isFinite(n) && n >= 0 ? Math.min(10000, Math.floor(n)) : 100;
  }

  get commandGapMs() { return this._minCommandInterval; }

  /**
   * P2641: Stale-data window = max(90s, pollInterval × 3).
   * WHY: Firmware can answer keep-alives while refusing GET/SET payloads (3.4/3.5 fire-and-forget).
   * HOW: Only real `data` / `dp-refresh` with dps rearms; heartbeat alone does not.
   * Contre quoi: "connected" tile + silent device forever.
   * @param {number} pollIntervalMs 0 disables watchdog (push-only devices).
   */
  setDataTimeout(pollIntervalMs) {
    const interval = Number(pollIntervalMs) || 0;
    this._pollIntervalMs = interval;
    const DATA_TIMEOUT_CYCLES = 3;
    const DATA_TIMEOUT_MIN_MS = 90000;
    const ms = interval > 0
      ? Math.max(DATA_TIMEOUT_MIN_MS, interval * DATA_TIMEOUT_CYCLES)
      : 0;
    if (ms === this._dataTimeoutMs) return;
    this._dataTimeoutMs = ms;
    if (ms === 0) this._stopDataWatchdog();
    else this._resetDataWatchdog();
  }

  get dataTimeoutMs() { return this._dataTimeoutMs; }

  /** P2642: toggle fire-and-forget for subsequent SETs */
  setFireAndForget(enabled) {
    this._fireAndForget = enabled === true;
  }

  get fireAndForget() { return this._fireAndForget === true; }

  /**
   * P2700: advance to the next protocol in the fallback chain (auto mode only, never when locked).
   * @returns {boolean} true when the version changed
   */
  _rotateProtocol(reason) {
    if (!this._autoDetectProtocol || this._lockProtocol) return false;
    if (!Array.isArray(this._protocolChain) || this._protocolChain.length < 2) return false;
    this._protocolAttemptIdx = (this._protocolAttemptIdx + 1) % this._protocolChain.length;
    this.version = this._protocolChain[this._protocolAttemptIdx];
    this._log(`[TUYA-TCP] ${reason} — trying protocol v${this.version}`);
    return true;
  }

  /** P2700: socket gone before any DPS on this session → counts toward protocol rotation. */
  _noteEarlyDrop(reason) {
    this._earlyDrops++;
    if (this._earlyDrops >= this._earlyDropsBeforeRotate) {
      this._earlyDrops = 0;
      this._rotateProtocol(`${reason} on v${this.version} without data`);
    }
  }

  _noteDeviceData() {
    if (!this._sessionConfirmed) {
      // P2700: first real DPS on this socket — only now is the protocol version proven.
      this._sessionConfirmed = true;
      this._earlyDrops = 0;
      this._protocolAttemptIdx = 0;
      this._protocolChain = buildProtocolFallbackChain(this.version);
      this.emit('version-resolved', this.version);
    }
    this._lastDpsAt = Date.now();
    this._answersPolls = true;
    this._resetDataWatchdog();
  }

  _resetDataWatchdog() {
    this._stopDataWatchdog();
    if (!this._dataTimeoutMs || !this._answersPolls || !this._connected || this._destroyed) return;
    this._dataWatchdogTimer = safeSetTimeout(() => {
      this._dataWatchdogTimer = null;
      if (this._destroyed || !this._connected) return;
      const secs = Math.round(this._dataTimeoutMs / 1000);
      this._log(`[TUYA-TCP] Connected but silent for ${secs}s (keep-alive ok, no DPS) — reconnecting`);
      this._connected = false;
      this._connectionState = 'disconnected';
      this._lastDisconnectReason = 'stale-data';
      this._stopHeartbeat();
      this._stopDataWatchdog();
      try { if (this._device) this._device.disconnect(); } catch (e) {
        this._log('[TUYA-TCP] Disconnect on stale-data:', e.message);
      }
      this.emit('disconnected');
      this.emit('connection-state', this._connectionState);
      if (!this._destroyed) this._scheduleReconnect();
    }, this._dataTimeoutMs);
    this._dataWatchdogTimer?.unref?.();
  }

  _stopDataWatchdog() {
    if (this._dataWatchdogTimer) {
      safeClearTimeout(this._dataWatchdogTimer);
      this._dataWatchdogTimer = null;
    }
  }

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
      // P2700 (thread 154077 #296): a 3.4/3.5 key exchange the device never answers (e.g. still
      // booting after a power cut) must not hang the connect forever without log or retry.
      const handshakeMs = Math.max(10000, (this._retryConfig.connectionTimeout || 5000) * 3);
      await this._withTimeout(this._device.connect(), handshakeMs, 'Connect/handshake timeout');
    } catch (err) {
      this._connecting = false;
      const msg = err.message || '';
      if (msg === 'Connect/handshake timeout') {
        const stale = this._device;
        this._device = null;
        try { stale?.removeAllListeners(); stale?.disconnect(); } catch (_e) { /* best effort */ }
        this._log(`[TUYA-TCP] No handshake answer on v${this.version} — will retry`);
        this._noteEarlyDrop('Handshake timeout');
        this._scheduleReconnect();
        return;
      }
      const isAuth = msg.includes('key') || msg.includes('cipher') || msg.includes('decrypt') || msg.includes('session');
      if (isAuth && this._autoDetectProtocol && !this._lockProtocol && this._protocolAttemptIdx < this._protocolChain.length - 1) {
        this._protocolAttemptIdx++;
        this.version = this._protocolChain[this._protocolAttemptIdx];
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
      this._outageAttempts = 0;
      this._offlineSince = null;
      this._connectAttempts = 0;
      // P2700: _protocolAttemptIdx is reset only once DPS confirm the session (_noteDeviceData).
      this._sessionConfirmed = false;
      this._connectedAt = Date.now();
      this._connectionStartTime = null; // v9.0.40: Reset total window on success
      this._missedHeartbeats = 0;
      this._startHeartbeat();
      // P2641: arm stale-data watchdog after connect (only once DPS prove polls work)
      this._resetDataWatchdog();
      // Auto-correct IP address if dynamic lookup found a new one
      const resolvedIp = d.device && d.device.ip;
      if (resolvedIp && resolvedIp !== this.ip) {
        this._log(`[TUYA-TCP] IP address auto-corrected from ${  this.ip  } to ${  resolvedIp}`);
        this.ip = resolvedIp;
        this.emit('ip-resolved', resolvedIp);
      }
      this._log(`[TUYA-TCP] Connected to ${  this.ip || 'auto-discovered IP'} (using protocol v${this.version})`);
      // P2700: 'version-resolved' now waits for the first DPS (see _noteDeviceData).
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
      this._stopDataWatchdog();
      this._log('[TUYA-TCP] Disconnected');
      if (!this._sessionConfirmed && this._connectedAt
        && Date.now() - this._connectedAt < this._earlyDropWindowMs) {
        this._noteEarlyDrop('Socket closed early');
      }
      this._connectedAt = 0;
      this.emit('disconnected');
      this.emit('connection-state', this._connectionState);
      if (!this._destroyed) {this._scheduleReconnect();}
    });
    d.on('data', (data) => {
      this._missedHeartbeats = 0;
      if (data && data.dps) {
        Object.assign(this._lastDps, data.dps);
        this._noteDeviceData(); // P2641: real DPS only — not heartbeat
        this.emit('dp-update', data.dps);
      }
    });
    d.on('dp-refresh', (data) => {
      this._missedHeartbeats = 0;
      if (data && data.dps) {
        Object.assign(this._lastDps, data.dps);
        this._noteDeviceData();
        this.emit('dp-update', data.dps);
      }
    });
    // Heartbeat proves socket liveness only — must NOT rearm stale-data watchdog
    d.on('heartbeat', () => { this._missedHeartbeats = 0; });
    d.on('error', (err) => {
      this._log('[TUYA-TCP] Error:', err.message);
      this.emit('error', err);
    });
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = safeSetInterval(() => {
      if (this._destroyed) {return;}
      if (!this._connected || !this._device) {return;}
      this._missedHeartbeats++;
      if (this._missedHeartbeats >= this._maxMissedHeartbeats) {
        this._log(`[TUYA-TCP] Heartbeat timeout (${  this._missedHeartbeats  } missed), reconnecting...`);
        this._connected = false;
        this._stopHeartbeat();
        this._stopDataWatchdog();
        try { this._device.disconnect(); } catch (e) { this._log('[TUYA-TCP] Disconnect on heartbeat timeout:', e.message); }
        this._scheduleReconnect();
        return;
      }
      try { this._device.refresh({ schema: true }); } catch (e) { this._log('[TUYA-TCP] Heartbeat refresh failed:', e.message); }
    }, this._heartbeatInterval);
    if (this._heartbeatTimer && typeof this._heartbeatTimer.unref === 'function') {
      this._heartbeatTimer.unref();
    }
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      safeClearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  async setDP(dp, value, opts = {}) {
    const fireAndForget = opts.fireAndForget === true || this._fireAndForget === true;
    // v9.0.40: Queue command for retry when offline
    if (!this._connected && !this._destroyed) {
      return this._queueOfflineCommand({ type: 'set', dp, value, fireAndForget });
    }
    return this._enqueue(() => {
      if (!this._device || !this._connected) {throw new Error('Not connected');}
      if (fireAndForget) {
        // P2642: dispatch without awaiting ACK (3.4/3.5 / relay pulse)
        this._device.set({ dps: dp, set: value }).catch((err) => {
          const msg = String(err?.message || err);
          if (!msg.toLowerCase().includes('timeout')) {
            this._log(`[TUYA-TCP] Fire-and-forget SET DP${dp} failed: ${msg}`);
          }
        });
        return undefined;
      }
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

  /**
   * Probe which DPs a device exposes by asking for explicit DP id batches.
   * Optional and non-blocking for callers: never throws, resolves with a
   * detection map { "<dp>": { value, type } } (possibly empty).
   */
  async detectAvailableDps(opts = {}) {
    if (!this._device || !this._connected || this._detectingDps) {return {};}
    this._detectingDps = true;
    try {
      const result = await runProbes(
        (batch) => {
          // Direct (not queued) so a silent firmware cannot stall user commands with retries.
          if (!this._device || !this._connected) {return null;}
          return this._withTimeout(this._device.refresh({ requestedDPS: batch }), opts.perProbeTimeoutMs || 3000, 'DP probe timeout');
        },
        { ...opts, shouldStop: () => this._destroyed || !this._connected },
      );
      if (Object.keys(result).length) {
        this._log(`[TUYA-TCP] DP detection found: ${Object.keys(result).join(',')}`);
        this.emit('dps-detected', result);
      }
      return result;
    } catch (e) {
      this._log('[TUYA-TCP] DP detection failed:', e && e.message);
      return {};
    } finally {
      this._detectingDps = false;
    }
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
    if (this._offlineCommandQueue.length === 0) {return;}
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
          await this.setDP(cmd.dp, cmd.value, { fireAndForget: cmd.fireAndForget === true });
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
    // Outage-aware pacing with jitter (same 5 s base / x1.5 growth / cap as before).
    if (!this._offlineSince) {this._offlineSince = Date.now();}
    this._outageAttempts = (this._outageAttempts || 0) + 1;
    let delay;
    try {
      delay = computeReconnectDelay({
        attempt: this._outageAttempts,
        offlineForMs: Date.now() - this._offlineSince,
        baseMs: 5000,
        maxMs: this._maxReconnectDelay,
      });
    } catch (_e) {
      delay = Math.min(this._reconnectDelay, this._maxReconnectDelay);
    }
    this._log(`[TUYA-TCP] Reconnecting in ${  delay / 1000  }s... (attempt ${this._totalReconnects})`);
    this._reconnectTimer = safeSetTimeout(async () => {
      if (this._destroyed) {return;}
      this._reconnectTimer = null;
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay);
      await this.connect();
    }, delay);
    this._reconnectTimer.unref?.();
  }

  _clearReconnect() {
    if (this._reconnectTimer) {
      safeClearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  updateKey(newKey) {
    this.key = normalizeLocalKey(newKey) || newKey;
    this._log('[TUYA-TCP] Local key updated, will use on next connect');
  }

  /** Prefer a discovered protocol version on next connect cascade */
  setPreferredVersion(version) {
    this._protocolChain = buildProtocolFallbackChain(version);
    this._protocolAttemptIdx = 0;
    this.version = this._protocolChain[0];
    this._log(`[TUYA-TCP] Preferred protocol chain: ${this._protocolChain.join('→')}`);
  }

  updateIP(newIP) {
    if (!newIP || typeof newIP !== 'string') return;
    const trimmed = newIP.trim();
    if (!trimmed || trimmed === this.ip) return;
    const oldIP = this.ip;
    this.ip = trimmed;
    this._connectAttempts = 0;
    this._connectionStartTime = null;
    if (this._device && this._device.device) {
      this._device.device.ip = trimmed;
    }
    this._log(`[TUYA-TCP] IP updated from ${oldIP || 'none'} to ${trimmed}`);
    if (!this._connected && !this._destroyed) {
      this._clearReconnect();
      this.connect().catch((e) => this._log('[TUYA-TCP] Reconnect on updateIP failed:', e.message));
    }
  }

  async disconnect() {
    this._clearReconnect();
    this._stopHeartbeat();
    this._stopDataWatchdog();
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
        // ref'd on purpose: cleared in finally(); an unref'd guard let callers hang forever when idle.
      })
    ]).finally(() => {
      if (timer) { safeClearTimeout(timer); }
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
module.exports.PROTOCOL_VERSIONS = PROTOCOL_VERSIONS;
