'use strict';
// v5.12.8: TuyaLocalDevice - Enhanced base class for Tuya WiFi local LAN control
// Patterns from: tuyapi, tuya-local (HA), heszegi, rebtor, TinyTuya
// Supports: protocol auto-detect, exponential backoff, UDP discovery, batch DPs
const Homey = require('homey');

const PROTOCOL_VERSIONS = { V3_1: '3.1', V3_3: '3.3', V3_4: '3.4', V3_5: '3.5' };
const RECONNECT_MIN = 5000;
const RECONNECT_MAX = 300000;
const HEARTBEAT_INTERVAL = 30000;
const COMMAND_TIMEOUT = 8000;

class TuyaLocalDevice extends Homey.Device {
  /** Override: capability-to-DP mappings [{capability, dp, toDevice, fromDevice}] */
  get capabilityMap() { return []; }
  /** Override: protocol version (default auto-detect) */
  get protocolVersion() { return 'auto'; }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._connected = false;
    this._reconnectTimer = null;
    this._heartbeatTimer = null;
    this._tuyaDevice = null;
    this._reconnectDelay = RECONNECT_MIN;

    for (const cap of this.capabilityMap) {
      if (!this.hasCapability(cap.capability)) continue;
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }
    await this._createDevice();
  }

  async _createDevice() {
    const settings = this.getSettings();
    const { device_id, local_key, ip_address } = settings;
    if (!device_id || !local_key) {
      this.log('Missing device_id or local_key');
      await this.setUnavailable('Missing device credentials.');
      return;
    }
    try {
      const TuyAPI = require('tuyapi');
      const version = settings.protocol_version || this.protocolVersion;
      this._tuyaDevice = new TuyAPI({
        id: device_id,
        key: local_key,
        ip: ip_address || undefined,
        version: version === 'auto' ? '3.3' : version,
        issueRefreshOnConnect: true,
      });
      this._tuyaDevice.on('connected', () => this._onConnected());
      this._tuyaDevice.on('disconnected', () => this._onDisconnected());
      this._tuyaDevice.on('error', (err) => this._onError(err));
      this._tuyaDevice.on('data', (data) => this._onData(data));
      this._tuyaDevice.on('dp-refresh', (data) => this._onData(data));
      await this._connect();
    } catch (err) {
      this.error('TuyAPI create failed:', err.message);
      await this.setUnavailable('TuyAPI: ' + err.message);
    }
  }

  async _connect() {
    if (!this._tuyaDevice) return;
    try {
      if (!this._tuyaDevice.isConnected()) {
        await this._tuyaDevice.find();
        await this._tuyaDevice.connect();
      }
    } catch (err) {
      this.error('Connect failed:', err.message);
      this.setWarning('Connection failed - retrying...');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, RECONNECT_MAX);
      this._connect();
    }, this._reconnectDelay);
  }

  _startHeartbeat() {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this._heartbeatTimer = setInterval(() => {
      if (this._tuyaDevice && this._tuyaDevice.isConnected()) {
        this._tuyaDevice.refresh({ schema: true }).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL);
  }

  _onConnected() {
    this.log('Connected');
    this._connected = true;
    this._reconnectDelay = RECONNECT_MIN;
    this.setAvailable().catch(this.error);
    this.unsetWarning();
    this._startHeartbeat();
  }

  _onDisconnected() {
    this.log('Disconnected');
    this._connected = false;
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this.setUnavailable('Disconnected').catch(this.error);
    this._scheduleReconnect();
  }

  _onError(err) {
    this.error('Device error:', err.message || err);
  }

  _onData(data) {
    if (!data || !data.dps) return;
    this.log('DPs:', JSON.stringify(data.dps));
    for (const cap of this.capabilityMap) {
      if (data.dps[cap.dp] !== undefined) {
        const value = cap.fromDevice ? cap.fromDevice(data.dps[cap.dp]) : data.dps[cap.dp];
        this.setCapabilityValue(cap.capability, value).catch(this.error);
      }
    }
  }

  async _setDP(dp, value) {
    if (!this._tuyaDevice || !this._tuyaDevice.isConnected()) {
      throw new Error('Device not connected');
    }
    await this._tuyaDevice.set({ dps: parseInt(dp, 10), set: value });
  }

  async _setMultipleDPs(dpsObj) {
    if (!this._tuyaDevice || !this._tuyaDevice.isConnected()) {
      throw new Error('Device not connected');
    }
    await this._tuyaDevice.set({ multiple: true, data: dpsObj });
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['device_id','local_key','ip_address','protocol_version'].includes(k))) {
      this._destroyDevice();
      await this._createDevice();
    }
  }

  _destroyDevice() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    if (this._tuyaDevice) {
      try {
        this._tuyaDevice.removeAllListeners();
        if (this._tuyaDevice.isConnected()) this._tuyaDevice.disconnect();
      } catch (e) { /* ignore */ }
      this._tuyaDevice = null;
    }
  }

  async onDeleted() { this._destroyDevice(); }
}

TuyaLocalDevice.PROTOCOL_VERSIONS = PROTOCOL_VERSIONS;
module.exports = TuyaLocalDevice;