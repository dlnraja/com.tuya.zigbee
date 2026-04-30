'use strict';
const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

const TuyAPI = require('tuyapi');
const { EventEmitter } = require('events');
const TuyaUDPDiscovery = require('./TuyaUDPDiscovery');

const PROTOCOL_VERSIONS = ['3.3', '3.4', '3.5', '3.2', '3.1'];

// Shared discovery instance to save resources
let _sharedDiscovery = null;

class TuyaLocalClient extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id = opts.id;
    this.key = opts.key;
    this.ip = opts.ip || null;
    this.version = opts.version || '3.3';
    this._autoDetectProtocol = opts.autoDetectProtocol !== false;
    this._autoHealing = opts.autoHealing !== false;
    this._connected = false;
    this._connecting = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 5000;
    this._maxReconnectDelay = 60000;
    this._destroyed = false;
    this._device = null;
    this._lastDps = {};
    this._heartbeatTimer = null;
    this._heartbeatInterval = opts.heartbeatInterval || 10000; // v7.0.0: Reduced to 10s for "MAX Local" responsiveness
    this._homey = opts.homey || null;
    this._missedHeartbeats = 0;
    this._maxMissedHeartbeats = 3;
    this._log = opts.log || (() => {});
    this._connectAttempts = 0;
    this._protocolAttemptIdx = 0;
    this._commandQueue = [];
    this._commandBusy = false;
    this._minCommandInterval = 200;
    this._lastCommandTime = 0;
  }

  get connected() { return this._connected; }
  get lastDps() { return { ...this._lastDps }; }

  async connect() {
    if (this._destroyed || this._connecting) return;
    this._connecting = true;
    this._clearReconnect();
    this._stopHeartbeat();

    // v7.0.0: AUTO-HEALING (IP Relocation)
    if (this._autoHealing && (!this.ip || this._connectAttempts > 1)) {
      this._log('[TUYA-TCP] Auto-Healing: Scanning LAN for device ' + this.id);
      if (!_sharedDiscovery) {
        _sharedDiscovery = new TuyaUDPDiscovery({ 
           log: this._log,
           homey: this._homey // v7.0.16: Link to Homey mDNS
        });
        await _sharedDiscovery.start().catch(() => {});
      }
      const found = _sharedDiscovery.getDevice(this.id);
      if (found && found.ip && found.ip !== this.ip) {
        this._log('[TUYA-TCP] Auto-Healing: IP updated ' + (this.ip || 'none') + ' -> ' + found.ip);
        this.ip = found.ip;
        this.emit('ip-updated', this.ip);
      }
    }

    try {
      if (this._device) {
        try { this._device.removeAllListeners(); await this._device.disconnect(); } catch (e) {}
        this._device = null;
      }
      const config = { id: this.id, key: this.key, version: this.version, issueRefreshOnConnect: true };
      if (this.ip) config.ip = this.ip;
      this._device = new TuyAPI(config);
      this._setupListeners();
      this._connectAttempts++;
      if (!this.ip) {
        this._log('[TUYA-TCP] Finding device on LAN...');
        await this._device.find({ timeout: 10000 });
      }
      await this._device.connect();
    } catch (err) {
      this._connecting = false;
      const msg = err.message || '';
      
      // AUTO-DEGRADE / AUTO-UPGRADE PROTOCOL (Fix for exotic Tuya versions)
      const isAuth = msg.includes('key') || msg.includes('cipher') || msg.includes('decrypt') || msg.includes('session') || msg.includes('Payload');
      
      if (isAuth && this._autoDetectProtocol && this._protocolAttemptIdx < PROTOCOL_VERSIONS.length - 1) {
        this._protocolAttemptIdx++;
        const oldVersion = this.version;
        this.version = PROTOCOL_VERSIONS[this._protocolAttemptIdx];
        this._log(`[TUYA-TCP] Exotic device detected? Relocating protocol: ${oldVersion} -> ${this.version}`);
        return this.connect();
      } else if (isAuth) {
        this._log('[TUYA-TCP] AUTH ERROR');
        this.emit('auth-error', err);
      } else {
        this._log('[TUYA-TCP] Connect failed (attempt ' + this._connectAttempts + '):', err.message);
        this.emit('error', err);
      }
      this._scheduleReconnect();
    }
  }

  _setupListeners() {
    const d = this._device;
    if (!d) return;
    d.on('connected', () => {
      this._connected = true;
      this._connecting = false;
      this._reconnectDelay = 5000;
      this._connectAttempts = 0;
      this._protocolAttemptIdx = 0;
      this._missedHeartbeats = 0;
      this._startHeartbeat();
      this._log('[TUYA-TCP] Connected to ' + (this.ip || 'auto-discovered IP'));
      this.emit('connected');
    });
    d.on('disconnected', () => {
      this._connected = false;
      this._stopHeartbeat();
      this._log('[TUYA-TCP] Disconnected');
      this.emit('disconnected');
      if (!this._destroyed) this._scheduleReconnect();
    });
    d.on('data', (data) => {
      this._missedHeartbeats = 0;
      if (data && data.dps) {
        // v7.0.42: Deep DP validation and BigInt conversion
        for (const [dp, val] of Object.entries(data.dps)) {
           if (typeof val === 'string' && /^\d+$/.test(val) && val.length > 15) {
              data.dps[dp] = BigInt(val).toString(); // Standardize large numbers
           }
        }
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
    this._heartbeatTimer = setInterval(() => {
      if (!this._connected || !this._device) return;
      this._missedHeartbeats++;
      if (this._missedHeartbeats >= this._maxMissedHeartbeats) {
        this._log('[TUYA-TCP] Heartbeat timeout (' + this._missedHeartbeats + ' missed), reconnecting...');
        this._connected = false;
        this._stopHeartbeat();
        try { this._device.disconnect(); } catch (e) {}
        this._scheduleReconnect();
        return;
      }
      try { this._device.refresh({ schema: true }); } catch (e) {}
    }, this._heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) { clearInterval(this._heartbeatTimer); this._heartbeatTimer = null; }
  }

  async setDP(dp, value) {
    return this._enqueue(() => {
      if (!this._device || !this._connected) throw new Error('Not connected');
      return this._device.set({ dps: dp, set: value });
    });
  }

  async setDPs(dpsObj) {
    return this._enqueue(() => {
      if (!this._device || !this._connected) throw new Error('Not connected');
      return this._device.set({ multiple: true, data: dpsObj });
    });
  }

  async getDP(dp) {
    return this._enqueue(() => {
      if (!this._device || !this._connected) throw new Error('Not connected');
      return this._device.get({ dps: dp });
    });
  }

  async refresh() {
    if (!this._device || !this._connected) return;
    try { await this._device.refresh({ schema: true }); } catch (e) {}
  }

  _enqueue(fn) {
    return new Promise((resolve, reject) => {
      this._commandQueue.push({ fn, resolve, reject, retries: 0 });
      if (!this._commandBusy) this._processQueue();
    });
  }

  async _processQueue() {
    if (this._commandQueue.length === 0 || this._commandBusy) return;
    this._commandBusy = true;
    const cmd = this._commandQueue.shift();

    const now = Date.now();
    const wait = this._minCommandInterval - (now - this._lastCommandTime);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    
    try {
      const result = await cmd.fn();
      this._lastCommandTime = Date.now();
      cmd.resolve(result);
    } catch (err) {
      const retriable = err.message && (err.message.includes('timeout') || err.message.includes('EPIPE') || err.message.includes('ECONNRESET'));
      if (retriable && cmd.retries < 2 && this._connected) {
        cmd.retries++;
        this._log('[TUYA-TCP] Retry ' + cmd.retries + '/2: ' + err.message);
        this._commandQueue.unshift(cmd);
      } else {
        cmd.reject(err);
      }
    }
    this._commandBusy = false;
    if (this._commandQueue.length > 0) this._processQueue();
  }

  _scheduleReconnect() {
    if (this._destroyed || this._reconnectTimer) return;
    const delay = Math.min(this._reconnectDelay, this._maxReconnectDelay);
    this._log('[TUYA-TCP] Reconnecting in '+ delay/1000 + 's...');
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      this._reconnectDelay = safeMultiply(Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay), 1);
      await this.connect();
    }, delay);
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
    this._log('[TUYA-TCP] IP updated to ' + newIP);
  }

  async disconnect() {
    this._clearReconnect();
    this._stopHeartbeat();
    this._flushQueue('Disconnected');
    if (this._device && this._connected) {
      try { await this._device.disconnect(); } catch (e) {}
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

  async destroy() {
    this._destroyed = true;
    await this.disconnect();
    if (this._device) { this._device.removeAllListeners(); this._device = null; }
    this.removeAllListeners();
  }
}

module.exports = TuyaLocalClient;
