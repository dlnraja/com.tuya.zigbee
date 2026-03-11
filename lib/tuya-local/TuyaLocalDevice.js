'use strict';
// v5.12.7: TuyaLocalDevice - Base class for Tuya WiFi local LAN control
// Pattern extracted from heszegi/com.heszi.ledvance-wifi + rebtor/nl.rebtor.tuya
// Uses tuyapi (https://codetheweb.github.io/tuyapi/) for direct device communication
const Homey = require('homey');

const PROTOCOL_VERSIONS = { V3_3: '3.3', V3_4: '3.4', V3_5: '3.5' };
const RECONNECT_INTERVAL = 20000; // 20s keep-alive
const COMMAND_TIMEOUT = 5000;

class TuyaLocalDevice extends Homey.Device {
  /** Override in subclass to define capability-to-DP mappings */
  get capabilityMap() { return []; }
  /** Override to set protocol version (default 3.3) */
  get protocolVersion() { return PROTOCOL_VERSIONS.V3_3; }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._connected = false;
    this._reconnectTimer = null;
    this._tuyaDevice = null;

    // Register all capability listeners from the mapping
    for (const cap of this.capabilityMap) {
      if (!this.hasCapability(cap.capability)) continue;
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }

    // Try to connect
    await this._createDevice();
  }

  async _createDevice() {
    const settings = this.getSettings();
    const { device_id, local_key, ip_address } = settings;

    if (!device_id || !local_key) {
      this.log('Missing device_id or local_key in settings');
      await this.setUnavailable('Missing device credentials. Configure in device settings.');
      return;
    }

    try {
      // Dynamic require - tuyapi must be installed
      const TuyAPI = require('tuyapi');
      this._tuyaDevice = new TuyAPI({
        id: device_id,
        key: local_key,
        ip: ip_address || undefined,
        version: this.protocolVersion,
        issueRefreshOnConnect: true,
      });

      this._tuyaDevice.on('connected', () => this._onConnected());
      this._tuyaDevice.on('disconnected', () => this._onDisconnected());
      this._tuyaDevice.on('error', (err) => this._onError(err));
      this._tuyaDevice.on('data', (data) => this._onData(data));
      this._tuyaDevice.on('dp-refresh', (data) => this._onData(data));

      await this._connect();
    } catch (err) {
      this.error('Failed to create TuyAPI device:', err.message);
      await this.setUnavailable('TuyAPI not available: ' + err.message);
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
    }
    // Keep-alive reconnect loop
    this._scheduleReconnect();
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(() => this._connect(), RECONNECT_INTERVAL);
  }

  _onConnected() {
    this.log('Connected to device');
    this._connected = true;
    this.setAvailable().catch(this.error);
    this.unsetWarning();
  }

  _onDisconnected() {
    this.log('Disconnected from device');
    this._connected = false;
    this.setUnavailable('Device disconnected').catch(this.error);
    this._scheduleReconnect();
  }

  _onError(err) {
    this.error('Device error:', err.message || err);
  }

  _onData(data) {
    if (!data || !data.dps) return;
    this.log('Received DPs:', JSON.stringify(data.dps));
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
    try {
      await this._tuyaDevice.set({ dps: parseInt(dp, 10), set: value });
    } catch (err) {
      this.error('Failed to set DP', dp, '=', value, ':', err.message);
      throw err;
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['device_id', 'local_key', 'ip_address', 'protocol_version'].includes(k))) {
      this._destroyDevice();
      await this._createDevice();
    }
  }

  _destroyDevice() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._tuyaDevice) {
      try {
        this._tuyaDevice.removeAllListeners();
        if (this._tuyaDevice.isConnected()) this._tuyaDevice.disconnect();
      } catch (e) { /* ignore */ }
      this._tuyaDevice = null;
    }
  }

  async onDeleted() {
    this._destroyDevice();
  }
}

TuyaLocalDevice.PROTOCOL_VERSIONS = PROTOCOL_VERSIONS;
module.exports = TuyaLocalDevice;
