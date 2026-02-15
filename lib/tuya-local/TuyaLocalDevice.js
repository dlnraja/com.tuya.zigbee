'use strict';

const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');

class TuyaLocalDevice extends Homey.Device {

  async onInit() {
    this.log('[WIFI] Initializing Tuya Local WiFi device...');
    const settings = this.getSettings();
    this._deviceId = settings.device_id || this.getData().id;
    this._localKey = settings.local_key;
    this._ip = settings.ip || null;
    this._protocolVersion = settings.protocol_version || '3.3';
    this._pollInterval = null;
    this._prevCapValues = {};

    if (!this._deviceId || !this._localKey) {
      this.setUnavailable('Missing device_id or local_key in settings').catch(this.error);
      return;
    }

    this._client = new TuyaLocalClient({
      id: this._deviceId,
      key: this._localKey,
      ip: this._ip,
      version: this._protocolVersion,
      log: this.log.bind(this),
    });

    this._client.on('connected', () => {
      this.setAvailable().catch(this.error);
      this.log('[WIFI] Device online (local)');
    });

    this._client.on('disconnected', () => {
      this.setUnavailable('Device disconnected').catch(this.error);
    });

    this._client.on('auth-error', () => {
      this.setUnavailable('Authentication error - check local_key and protocol version').catch(this.error);
    });

    this._client.on('dp-update', (dps) => this._processDPUpdate(dps));

    this._client.on('error', (err) => {
      this.log('[WIFI] Client error:', err.message);
    });

    this._registerCapabilityListeners();

    await this._client.connect();

    this._pollInterval = this.homey.setInterval(() => {
      if (this._client && this._client.connected) {
        this._client.refresh().catch(() => {});
      }
    }, 30000);

    const app = this.homey.app;
    if (app && app._tuyaUDPDiscovery && !this._ip) {
      const discovered = app._tuyaUDPDiscovery.getDevice(this._deviceId);
      if (discovered && discovered.ip) {
        this._client.updateIP(discovered.ip);
        this.log('[WIFI] IP resolved via UDP discovery: ' + discovered.ip);
      }
    }

    this.log('[WIFI] Init complete');
  }

  get dpMappings() { return {}; }

  get reverseDpMappings() {
    if (!this._reverseDpMap) {
      this._reverseDpMap = {};
      const mappings = this.dpMappings;
      for (const [dp, config] of Object.entries(mappings)) {
        if (config.capability) {
          this._reverseDpMap[config.capability] = { dp: String(dp), ...config };
        }
      }
    }
    return this._reverseDpMap;
  }

  _processDPUpdate(dps) {
    const mappings = this.dpMappings;
    const changes = {};
    for (const [dp, value] of Object.entries(dps)) {
      const mapping = mappings[dp];
      if (!mapping || !mapping.capability) continue;
      let transformed = value;
      if (typeof mapping.transform === 'function') {
        transformed = mapping.transform(value);
      } else if (mapping.divisor && typeof value === 'number') {
        transformed = value / mapping.divisor;
      }
      if (transformed !== null && transformed !== undefined) {
        const cap = mapping.capability;
        const prev = this._prevCapValues[cap];
        this.setCapabilityValue(cap, transformed).catch(this.error);
        this.log('[WIFI] DP' + dp + ' -> ' + cap + ' = ' + transformed);
        if (prev !== undefined && prev !== transformed) {
          changes[cap] = { from: prev, to: transformed, dp: dp };
        }
        this._prevCapValues[cap] = transformed;
      }
    }
    if (Object.keys(changes).length > 0) {
      this._fireFlowTriggers(changes);
    }
  }

  _fireFlowTriggers(changes) {
    // Override in subclass to fire specific flow triggers
  }

  _registerCapabilityListeners() {
    const reverse = this.reverseDpMappings;
    for (const [capability, config] of Object.entries(reverse)) {
      if (!config.writable && config.writable !== undefined) continue;
      if (!this.hasCapability(capability)) continue;
      this.registerCapabilityListener(capability, async (value) => {
        let dpValue = value;
        if (typeof config.reverseTransform === 'function') {
          dpValue = config.reverseTransform(value);
        } else if (config.divisor && typeof value === 'number') {
          dpValue = Math.round(value * config.divisor);
        }
        this.log('[WIFI] Setting DP' + config.dp + ' = ' + dpValue);
        await this._client.setDP(String(config.dp), dpValue);
      });
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    const reconnectKeys = ['ip', 'local_key', 'device_id', 'protocol_version'];
    if (changedKeys.some((k) => reconnectKeys.includes(k))) {
      this.log('[WIFI] Settings changed, reconnecting...');
      if (this._pollInterval) { this.homey.clearInterval(this._pollInterval); this._pollInterval = null; }
      if (this._client) await this._client.destroy();
      this._reverseDpMap = null;
      this._prevCapValues = {};
      await this.onInit();
    }
  }

  async onDeleted() {
    this.log('[WIFI] Device deleted, cleaning up...');
    if (this._pollInterval) this.homey.clearInterval(this._pollInterval);
    if (this._client) await this._client.destroy();
  }
}

module.exports = TuyaLocalDevice;
