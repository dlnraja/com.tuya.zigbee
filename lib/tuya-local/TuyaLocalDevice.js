'use strict';
// v5.12.9: TuyaLocalDevice - Enhanced base class for Tuya WiFi local LAN control
// Uses the highly robust, rate-limited and queued TuyaLocalClient wrapper.
// Pattern from: tuya-local (HA), heszegi, rebtor, TinyTuya, Drenso/com.tuya2
const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');

class TuyaLocalDevice extends Homey.Device {
  /** Override: capability-to-DP mappings [{capability, dp, toDevice, fromDevice}] */
  get capabilityMap() {
    if (this.dpMappings) {
      const map = [];
      for (const [dp, cfg] of Object.entries(this.dpMappings)) {
        if (cfg && cfg.capability) {
          map.push({
            capability: cfg.capability,
            dp: isNaN(dp) ? dp : parseInt(dp, 10),
            toDevice: cfg.reverseTransform || ((v) => {
              if (cfg.divisor) {return v * cfg.divisor;}
              if (cfg.multiplier) {return v / cfg.multiplier;}
              return v;
            }),
            fromDevice: cfg.transform || ((v) => {
              if (cfg.divisor) {return v / cfg.divisor;}
              if (cfg.multiplier) {return v * cfg.multiplier;}
              return v;
            })
          });
        }
      }
      return map;
    }
    return [];
  }
  /** Override: protocol version (default auto-detect) */
  get protocolVersion() { return 'auto'; }

  
  /** Safe app getter to prevent proxy crash */
  get safeApp() {
    try { if (!this.homey || this.homey.isDestroyed) return null; return this.homey.app; } catch(e) { return null; }
  }

  async onInit() {
    this.log('TuyaLocalDevice init:', this.getName());
    this._connected = false;
    this._client = null;

    for (const cap of this.capabilityMap) {
      if (!this.hasCapability(cap.capability)) {continue;}
      this.registerCapabilityListener(cap.capability, async (value) => {
        const dpValue = cap.toDevice ? cap.toDevice(value) : value;
        await this._setDP(cap.dp, dpValue);
      });
    }
    await this._createDevice();
  }

  async _createDevice() {
    const settings = this.getSettings();
    const deviceId = settings.device_id;
    const localKey = settings.local_key || settings.device_key;
    const ipAddress = settings.ip || settings.device_ip || settings.ip_address;

    if (!deviceId || !localKey) {
      this.log('Missing device_id or local_key/device_key');
      await this.setUnavailable('Missing device credentials.');
      return;
    }
    try {
      const version = settings.protocol_version || this.protocolVersion;
      this._client = new TuyaLocalClient({
        id: deviceId,
        key: localKey,
        ip: ipAddress || undefined,
        version: version === 'auto' ? '3.3' : version,
        autoDetectProtocol: version === 'auto',
        resolveIP: (id) => {
          if (this.homey && this.safeApp && this.safeApp?._tuyaUDPDiscovery) {
            const discovered = this.safeApp?._tuyaUDPDiscovery.getDevice(id);
            return discovered ? discovered.ip : null;
          }
          return null;
        },
        log: (...args) => this.log('[TUYA-TCP]', ...args),
      });

      this._client.on('connected', () => this._onConnected());
      this._client.on('disconnected', () => this._onDisconnected());
      this._client.on('error', (err) => this._onError(err));
      this._client.on('dp-update', (dps) => this._onData({ dps }));
      this._client.on('auth-error', (err) => {
        this.setWarning('Authentication failed: Local key might have changed. Attempting auto-recovery...');
        this._attemptLocalKeyRecovery();
      });

      // v7.5.0: Dynamic IP self-healing cache
      this._client.on('ip-resolved', (resolvedIp) => {
        const settings = this.getSettings();
        const newSettings = {};
        if (settings.ip !== undefined && settings.ip !== resolvedIp) newSettings.ip = resolvedIp;
        if (settings.device_ip !== undefined && settings.device_ip !== resolvedIp) newSettings.device_ip = resolvedIp;
        if (settings.ip_address !== undefined && settings.ip_address !== resolvedIp) newSettings.ip_address = resolvedIp;

        if (Object.keys(newSettings).length > 0) {
          this.log(`[TUYA-TCP] Dynamic IP change detected, storing resolved IP ${resolvedIp} in settings`);
          this.setSettings(newSettings).catch(this.error);
        }
      });

      // v7.5.0: Dynamic Protocol Version self-healing cache
      this._client.on('version-resolved', (resolvedVersion) => {
        const settings = this.getSettings();
        if (settings.protocol_version !== undefined && settings.protocol_version !== resolvedVersion) {
          this.log(`[TUYA-TCP] Auto-detected protocol version v${resolvedVersion}, storing in settings`);
          this.setSettings({ protocol_version: resolvedVersion }).catch(this.error);
        }
      });

      await this._client.connect();
    } catch (err) {
      this.error('TuyaLocalClient create failed:', err.message);
      await this.setUnavailable(`Client: ${  err.message}`);
    }
  }

  _onConnected() {
    this.log('Connected');
    this._connected = true;
    this.setAvailable().catch(this.error);
    this.unsetWarning();
  }

  _onDisconnected() {
    this.log('Disconnected');
    this._connected = false;
    this.setUnavailable('Disconnected').catch(this.error);
  }

  _onError(err) {
    const msg = err.message || '';
    this.error('Device error:', msg);
    if (msg.includes('find()') || msg.includes('timeout')) {
      this.setWarning('Discovery timeout: Please assign a Static IP in settings if your router blocks UDP broadcasts.');
    }
  }

  async _onData(data) {
    if (!data || !data.dps) {return;}
    this.log('DPs:', JSON.stringify(data.dps));
    for (const cap of this.capabilityMap) {
      if (data.dps[cap.dp] !== undefined) {
        const value = cap.fromDevice ? cap.fromDevice(data.dps[cap.dp]) : data.dps[cap.dp];
        await this.setCapabilityValue(cap.capability, value).catch(this.error);
      }
    }
  }

  async _setDP(dp, value) {
    if (!this._client || !this._client.connected) {
      throw new Error('Device not connected');
    }
    const dpId = isNaN(dp) ? dp : parseInt(dp, 10);
    await this._client.setDP(dpId, value);
  }

  async _setMultipleDPs(dpsObj) {
    if (!this._client || !this._client.connected) {
      throw new Error('Device not connected');
    }
    await this._client.setDPs(dpsObj);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    let needsRecreation = false;
    for (const key of changedKeys) {
      if (['device_id', 'local_key', 'device_key'].includes(key)) {
        needsRecreation = true;
      }
      if (['ip', 'device_ip', 'ip_address'].includes(key)) {
        const val = newSettings[key];
        if (this._client && val !== this._client.ip) {
          needsRecreation = true;
        }
      }
      if (key === 'protocol_version') {
        const val = newSettings[key];
        if (this._client && val !== this._client.version) {
          needsRecreation = true;
        }
      }
    }

    if (needsRecreation) {
      this.log('[TUYA-TCP] Setting change requires client recreation, restarting connection...');
      this._destroyDevice();
      await this._createDevice();
    }
  }


  _destroyDevice() {
    if (this._client) {
      try {
        this._client.destroy();
      } catch (e) { /* ignore */ }
      this._client = null;
    }
    this._connected = false;
  }

  async _attemptLocalKeyRecovery() {
    if (this._isRecoveringKey) return;
    this._isRecoveringKey = true;
    
    this.log('[TUYA-TCP] 🔄 Attempting intelligent Local Key auto-recovery...');
    
    try {
      const accessId = this.homey.settings.get('tuya_cloud_access_id');
      const accessKey = this.homey.settings.get('tuya_cloud_access_secret');
      const region = this.homey.settings.get('tuya_cloud_region') || 'eu';
      
      if (!accessId || !accessKey) {
        this.log('[TUYA-TCP] ❌ Cannot auto-recover key: Cloud API credentials missing in app settings.');
        this._isRecoveringKey = false;
        return;
      }
      
      const deviceId = this.getSettings().device_id;
      if (!deviceId) {
        this._isRecoveringKey = false;
        return;
      }

      const TuyaCloudAPI = require('./TuyaCloudAPI');
      const api = new TuyaCloudAPI({ accessId, accessKey, region, log: this.log.bind(this) });
      
      this.log(`[TUYA-TCP] ☁️ Fetching fresh local_key for device ${deviceId}...`);
      const res = await api.getDeviceInfo(deviceId);
      
      if (res && res.success && res.result && res.result.local_key) {
        const newLocalKey = res.result.local_key;
        this.log(`[TUYA-TCP] ✅ New local_key fetched successfully!`);
        
        // Update settings without triggering onSettings reload (or handle it correctly)
        await this.setSettings({ local_key: newLocalKey }).catch(this.error);
        
        if (this._client) {
          this._client.updateKey(newLocalKey);
          // The client will use the new key on its next auto-reconnect attempt
        }
        this.setWarning('Local key auto-recovered successfully. Reconnecting...');
      } else {
        this.log('[TUYA-TCP] ❌ Cloud API returned failure or no local_key:', res);
        this.setWarning('Auto-recovery failed. Please check your Cloud API credentials or re-pair.');
      }
    } catch (err) {
      this.error('[TUYA-TCP] ❌ Auto-recovery error:', err.message);
    }
    
    this._isRecoveringKey = false;
  }

  async onUninit() {
    this._destroyDevice();
    if (super.onUninit) {
      await super.onUninit();
    }
  }

  async onDeleted() {
    this._destroyDevice();
  }

  /**
   * triggerFlowCard - Safe helper to trigger a device flow card using modern SDKv3 API
   * Follows strict SDK3 patterns for device-specific triggers.
   *
   * @param {string} cardId - Flow trigger card ID
   * @param {Object} [tokens={}] - Dynamic flow tokens
   * @param {Object} [state={}] - Flow card state
   * @returns {Promise<boolean>} - True if triggered successfully
   */
  async triggerFlowCard(cardId, tokens = {}, state = {}) {
    this.log(`[FLOW] 🎬 Triggering card: ${cardId}`);
    try {
      let card = null;

      // 1. Try modern SDKv3 getDeviceTriggerCard
      if (this.homey.flow && typeof this.homey.flow.getDeviceTriggerCard === 'function') {
        try {
          card = this.homey.flow.getDeviceTriggerCard(cardId);
        } catch (e) {
          // If not found as device trigger
        }
      }

      if (card && typeof card.trigger === 'function') {
        await card.trigger(this, tokens, state);
        this.log(`[FLOW] ✅ Card triggered successfully: ${cardId}`);
        return true;
      } else {
        this.log(`⚠️ [FLOW] Card not found or trigger is not a function: ${cardId}`);
      }
    } catch (err) {
      this.error(`❌ [FLOW] Error triggering card ${cardId}:`, err.message);
    }
    return false;
  }

}

module.exports = TuyaLocalDevice;