'use strict';

const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');
const TuyaCloudAPI = require('./TuyaCloudAPI');

class TuyaLocalDevice extends Homey.Device {

  async onInit() {
    this.log('[WIFI] Initializing Tuya Local WiFi device...');
    const settings = this.getSettings();
    this._deviceId = settings.device_id || this.getData().id;
    this._localKey = settings.local_key;
    this._ip = settings.ip || null;
    this._protocolVersion = settings.protocol_version || '3.3';
    
    // SmartLife Auth Settings
    this._slUser = settings.smartlife_username;
    this._slPass = settings.smartlife_password;
    this._slRegion = settings.region || 'EU';
    this._autoDiscover = settings.auto_discover !== false; // Default true

    // Auto-discover if configured
    if (this._autoDiscover && this._slUser && this._slPass && this._deviceId) {
      try {
        await this._performAutoDiscovery();
      } catch (err) {
        this.log('[WIFI] Auto-discovery failed (continuing with stored settings):', err.message);
      }
    }

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
      this.log('[WIFI] Auth error — attempting auto key refresh...');
      this._autoRefreshKey().catch(() => {
        this.setUnavailable('Authentication error - check local_key and protocol version').catch(this.error);
      });
    });

    this._client.on('dp-update', (dps) => this._processDPUpdate(dps));

    this._client.on('error', (err) => {
      this.log('[WIFI] Client error:', err.message);
    });

    this._registerCapabilityListeners();

    try {
      await this._client.connect();
    } catch (err) {
      this.log('[WIFI] Initial connect failed:', err.message);
      this.setUnavailable('Connection failed: ' + err.message).catch(() => {});
    }

    this._pollInterval = this.homey.setInterval(() => {
      if (this._client && this._client.connected) {
        this._client.refresh().catch(() => {});
      }
    }, 30000);

    const app = this.homey.app;
    if (app && app._tuyaUDPDiscovery) {
      const discovered = app._tuyaUDPDiscovery.getDevice(this._deviceId);
      if (discovered && discovered.ip) {
        this._client.updateIP(discovered.ip);
        this.log('[WIFI] IP resolved via UDP discovery: ' + discovered.ip);
      }
      this._onUDPFound = (info) => {
        if (info.deviceId === this._deviceId && this._client) {
          this._client.updateIP(info.ip);
          this.log('[WIFI] UDP discovery: ' + info.ip);
        }
      };
      this._onUDPUpdated = (info) => {
        if (info.deviceId === this._deviceId && this._client) {
          this._client.updateIP(info.ip);
          this.log('[WIFI] IP changed via UDP: ' + info.ip);
          if (!this._client.connected) {
            this._client.connect().catch(() => {});
          }
        }
      };
      app._tuyaUDPDiscovery.on('device-found', this._onUDPFound);
      app._tuyaUDPDiscovery.on('device-updated', this._onUDPUpdated);
    }

    this.log('[WIFI] Init complete');
  }

  async _performAutoDiscovery() {
    this.log('[WIFI] Auto-discovering via SmartLife...');
    try {
      if (!this._slUser || !this._slPass) return;
      
      const TuyaCloudAPI = require('./TuyaCloudAPI');
      const api = new TuyaCloudAPI({ 
        region: this._slRegion, 
        log: this.log.bind(this) 
      });
      
      // Login
      const login = await api.loginWithSmartLife(this._slUser, this._slPass);
      if (!login.success) throw new Error('Login failed');
      
      // Get device details
      const devices = await api.getDevices(login.uid);
      const target = devices.find(d => d.deviceId === this._deviceId);
      
      if (target) {
        this.log('[WIFI] Found device:', target.name);
        let updated = false;
        
        if (target.localKey && target.localKey !== this._localKey) {
          this._localKey = target.localKey;
          updated = true;
          this.log('[WIFI] Local Key updated');
        }
        
        if (updated) {
          await this.setSettings({ local_key: this._localKey }).catch(() => {});
        }
      } else {
        this.log('[WIFI] Device not found in SmartLife account');
      }
    } catch (e) {
      this.log('[WIFI] Auto-discovery error:', e.message);
      throw e;
    }
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
        if (!this._client || !this._client.connected) throw new Error('Device not connected');
        this.log('[WIFI] Setting DP' + config.dp + ' = ' + dpValue);
        await this._client.setDP(String(config.dp), dpValue);
      });
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
      const reconnectKeys = ['ip', 'local_key', 'device_id', 'protocol_version'];
      if (changedKeys.some((k) => reconnectKeys.includes(k))) {
        this.log('[WIFI] Settings changed, reconnecting...');
        if (this._pollInterval) { this.homey.clearInterval(this._pollInterval); this._pollInterval = null; }
        if (this._client) { await this._client.destroy(); this._client = null; }
        this._reverseDpMap = null;
        this._prevCapValues = {};
        await this.onInit();
      }
    } catch (err) {
      this.error('[WIFI] onSettings error:', err);
    }
  }

  async _autoRefreshKey() {
    const id = this.homey.settings.get('tuya_cloud_access_id');
    const secret = this.homey.settings.get('tuya_cloud_access_secret');
    const region = this.homey.settings.get('tuya_cloud_region') || 'eu';
    if (!id || !secret) throw new Error('No cloud credentials');
    this.log('[WIFI] Refreshing local key from cloud...');
    const api = new TuyaCloudAPI({ accessId: id, accessSecret: secret, region, log: this.log.bind(this) });
    const newKey = await api.refreshLocalKey(this._deviceId);
    if (!newKey || newKey === this._localKey) throw new Error('Key unchanged');
    this._localKey = newKey;
    await this.setSettings({ local_key: newKey }).catch(() => {});
    if (this._client) {
      this._client.updateKey(newKey);
      await this._client.disconnect();
      await this._client.connect();
    }
    this.log('[WIFI] Key refreshed, reconnected');
  }

  _cleanupUDP() {
    const app = this.homey.app;
    if (app && app._tuyaUDPDiscovery) {
      if (this._onUDPFound) app._tuyaUDPDiscovery.removeListener('device-found', this._onUDPFound);
      if (this._onUDPUpdated) app._tuyaUDPDiscovery.removeListener('device-updated', this._onUDPUpdated);
    }
  }

  async onDeleted() {
    this.log('[WIFI] Device deleted, cleaning up...');
    this._cleanupUDP();
    if (this._pollInterval) this.homey.clearInterval(this._pollInterval);
    if (this._client) await this._client.destroy();
  }
}

module.exports = TuyaLocalDevice;
