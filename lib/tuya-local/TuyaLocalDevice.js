'use strict';
// v5.12.9: TuyaLocalDevice - Enhanced base class for Tuya WiFi local LAN control
// Uses the highly robust, rate-limited and queued TuyaLocalClient wrapper.
// Pattern from: tuya-local (HA), heszegi, rebtor, TinyTuya, Drenso/com.tuya2
const Homey = require('homey');
const TuyaLocalClient = require('./TuyaLocalClient');

let UnifiedBatteryHandler;
try {
  UnifiedBatteryHandler = require('../battery/UnifiedBatteryHandler');
} catch (_e) {
  UnifiedBatteryHandler = null;
}

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
              if (cfg.divisor) return v * cfg.divisor;
              if (cfg.multiplier) return v / cfg.multiplier;
              return v;
            }),
            fromDevice: (v) => this._fromDeviceValue(cfg.capability, dp, cfg, v)
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
      const version = settings.protocol_version || this.protocolVersion;
      this._client = new TuyaLocalClient({
        id: device_id,
        key: local_key,
        ip: ip_address || undefined,
        version: version === 'auto' ? '3.3' : version,
        autoDetectProtocol: version === 'auto',
        log: (...args) => this.log('[TUYA-TCP]', ...args),
      });

      this._client.on('connected', () => this._onConnected());
      this._client.on('disconnected', () => this._onDisconnected());
      this._client.on('error', (err) => this._onError(err));
      this._client.on('dp-update', (dps) => this._onData({ dps }));
      this._client.on('auth-error', (err) => {
        this.setWarning('Authentication failed: Local key might have changed. Re-fetch from cloud.');
      });

      await this._client.connect();
    } catch (err) {
      this.error('TuyaLocalClient create failed:', err.message);
      await this.setUnavailable('Client: ' + err.message);
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
    if (!data || !data.dps) return;
    this.log('DPs:', JSON.stringify(data.dps));
    for (const cap of this.capabilityMap) {
      if (data.dps[cap.dp] !== undefined) {
        const value = cap.fromDevice ? cap.fromDevice(data.dps[cap.dp]) : data.dps[cap.dp];
        if (cap.capability === 'measure_battery' && (value === null || value === undefined)) {
          this.log(`[WIFI-BATTERY] Ignored invalid DP${cap.dp} battery value: ${data.dps[cap.dp]}`);
          continue;
        }
        await this._setLocalCapabilityValue(cap.capability, value).catch(this.error);
        if (cap.capability === 'measure_battery') {
          await this.setStoreValue?.('last_battery_percentage', Math.round(Number(value))).catch(() => {});
          await this.setStoreValue?.('last_battery_time', Date.now()).catch(() => {});
          await this.setStoreValue?.('last_battery_source', `wifi-dp-${cap.dp}`).catch(() => {});
          await this.setStoreValue?.('last_battery_estimated', false).catch(() => {});
        }
      }
    }
  }

  _fromDeviceValue(capability, dp, cfg, rawValue) {
    if (capability === 'measure_battery') {
      return this._normalizeLocalBatteryValue(dp, rawValue, cfg);
    }

    if (cfg.transform) return cfg.transform(rawValue);
    if (cfg.divisor) return rawValue / cfg.divisor;
    if (cfg.multiplier) return rawValue * cfg.multiplier;
    return rawValue;
  }

  _normalizeLocalBatteryValue(dp, rawValue, cfg = {}) {
    if (!UnifiedBatteryHandler) {
      const numeric = Number(rawValue);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 200 || numeric === 255 || numeric === 0xFFFF) {
        return null;
      }
      return numeric > 100 ? Math.round(numeric / 2) : Math.round(numeric);
    }

    const transformed = cfg.transform ? cfg.transform(rawValue) : rawValue;
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData?.() || {};
    const manufacturer = cfg.manufacturerName ||
      settings.zb_manufacturer_name ||
      settings.manufacturerName ||
      store.manufacturerName ||
      data.manufacturerName ||
      '';
    const modelId = cfg.modelId ||
      settings.zb_model_id ||
      settings.modelId ||
      store.modelId ||
      data.modelId ||
      '';
    const lookedUpProfile = UnifiedBatteryHandler.lookupBatteryProfile?.(manufacturer, modelId);
    const profile = cfg.batteryProfile || lookedUpProfile || {
      dpId: Number(dp),
      algorithm: cfg.batteryAlgorithm || cfg.algorithm || 'direct',
      chemistry: cfg.batteryType || cfg.chemistry || 'CR2032',
    };

    const normalized = UnifiedBatteryHandler.normalizeTuyaBatteryValue(Number(dp), transformed, {
      profile,
      profileMatch: true,
      batteryType: cfg.batteryType || profile.chemistry || 'CR2032',
      lastValue: this.getCapabilityValue?.('measure_battery'),
      temperature: this.getCapabilityValue?.('measure_temperature') || settings.temperature,
      stateMode: cfg.stateMode,
    });

    if (normalized === null) {
      return UnifiedBatteryHandler.normalizeStoredBattery(transformed);
    }

    return normalized;
  }

  async _setLocalCapabilityValue(capability, value) {
    if (typeof this.safeSetCapabilityValue === 'function') {
      return this.safeSetCapabilityValue(capability, value);
    }
    return this.setCapabilityValue(capability, value);
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
    if (changedKeys.some(k => ['device_id','local_key','ip_address','protocol_version'].includes(k))) {
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
