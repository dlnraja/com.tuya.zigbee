'use strict';

const TuyAPI = require('tuyapi');
const { EventEmitter } = require('events');

class TuyaLocalClient extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id = opts.id;
    this.key = opts.key;
    this.ip = opts.ip || null;
    this.version = opts.version || '3.3';
    this._connected = false;
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
  }

  get connected() { return this._connected; }
  get lastDps() { return { ...this._lastDps }; }

  async connect() {
    if (this._destroyed) return;
    this._clearReconnect();
    this._stopHeartbeat();
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
      const isAuth = err.message && (err.message.includes('key') || err.message.includes('cipher') || err.message.includes('decrypt'));
      if (isAuth) {
        this._log('[TUYA-TCP] AUTH ERROR: Wrong local_key or protocol version');
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
    d.on('connected', () => {
      this._connected = true;
      this._reconnectDelay = 5000;
      this._connectAttempts = 0;
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
    if (!this._device || !this._connected) throw new Error('Not connected');
    await this._device.set({ dps: dp, set: value });
  }

  async setDPs(dpsObj) {
    if (!this._device || !this._connected) throw new Error('Not connected');
    await this._device.set({ multiple: true, data: dpsObj });
  }

  async getDP(dp) {
    if (!this._device || !this._connected) throw new Error('Not connected');
    return this._device.get({ dps: dp });
  }

  async refresh() {
    if (!this._device || !this._connected) return;
    try { await this._device.refresh({ schema: true }); } catch (e) {}
  }

  _scheduleReconnect() {
    if (this._destroyed || this._reconnectTimer) return;
    const delay = Math.min(this._reconnectDelay, this._maxReconnectDelay);
    this._log('[TUYA-TCP] Reconnecting in ' + (delay / 1000) + 's...');
    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, this._maxReconnectDelay);
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
    if (this._device && this._connected) {
      try { await this._device.disconnect(); } catch (e) {}
    }
    this._connected = false;
  }

  async destroy() {
    this._destroyed = true;
    await this.disconnect();
    if (this._device) { this._device.removeAllListeners(); this._device = null; }
    this.removeAllListeners();
  }
}

module.exports = TuyaLocalClient;
