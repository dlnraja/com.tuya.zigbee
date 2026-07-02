'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');
const { UniversalDPSender } = require('../../lib/tuya/UniversalDPSender');

const MTG_RELAY_RADARS = new Set([
  '_tze204_sbyx0lm6',
  '_tze204_clrdrnya',
  '_tze204_dtzziy1e',
  '_tze204_iaeejhvf',
  '_tze204_mtoaryre',
  '_tze200_mp902om5',
  '_tze204_pfayrzcw',
  '_tze284_4qznlkbu',
  '_tze200_clrdrnya',
  '_tze200_sbyx0lm6',
]);

/**
 * SensorIlluminancePresenceDevice - v8.0.0
 * Gold Standard Refactor: Unified architecture for Multi-Sensor Radar/Presence devices.
 * Features: Intelligent Inference, Auto-Discovery, and SDK3 Lifecycle Management.
 */
class SensorIlluminancePresenceDevice extends UnifiedSensorBase {

  _getPresenceConfig() {
    if (!this._cachedPresenceConfig) {
      this._cachedPresenceConfig = getSensorConfig(this.getManufacturerName(), this.getStoreValue('modelId'));
    }
    return this._cachedPresenceConfig;
  }

  get mainsPowered() {
    const config = this._getPresenceConfig();
    if (config?.mainsPowered) {return true;}
    return MTG_RELAY_RADARS.has(String(this.getManufacturerName() || '').toLowerCase());
  }

  get sensorCapabilities() {
    const config = this._getPresenceConfig();
    const caps = new Set(['alarm_motion', 'alarm_human', 'button.1']);
    const noBattery = this.mainsPowered
      || config.noBatteryCapability
      || config.suppressBatteryCapability
      || config.disableBatteryReporting;

    const addCap = (capability) => {
      if (!capability) {return;}
      if ((capability === 'measure_battery' || capability === 'alarm_battery') && noBattery) {return;}
      if (capability === 'measure_temperature' && config.noTemperature) {return;}
      if (capability === 'measure_humidity' && config.noHumidity) {return;}
      if (capability === 'onoff' && !config.hasRelay) {return;}
      caps.add(capability);
    };

    if (config.hasIlluminance) {caps.add('measure_luminance');}
    for (const mapping of Object.values(config.dpMap || {})) {
      addCap(mapping.cap);
    }

    return Array.from(caps);
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[RADAR] 🚀 v8.0.0 Refactor Initializing...');
      
      // Initialize Advanced Components
      this._inference = new IntelligentPresenceInference(this);
      this._discovery = new IntelligentDPAutoDiscovery(this);
      
      // Standard Sensor Initialization
      await super.onNodeInit({ zclNode });

      await this._applyPresenceCapabilityProfile();
      this._registerRelayCapabilityListener();

      // Detect firmware for inference tuning
      const appVersion = this.getStoreValue('appVersion') || this.zclNode.endpoints[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}

      // Start device-specific maintenance cycles
      this._startRadarCycle(zclNode);

      this.log('[RADAR] ✅ Ready');
    }, 'onNodeInit');
  }

  async _applyPresenceCapabilityProfile() {
    const requiredCaps = new Set(this.sensorCapabilities);
    const staleCaps = [
      'measure_battery',
      'alarm_battery',
      'measure_temperature',
      'measure_humidity',
      'onoff',
    ];

    for (const cap of requiredCaps) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(e => this.log(`[RADAR] Could not add ${cap}: ${e.message}`));
      }
    }

    for (const cap of staleCaps) {
      if (this.hasCapability(cap) && !requiredCaps.has(cap)) {
        await this.removeCapability(cap).catch(e => this.log(`[RADAR] Could not remove stale ${cap}: ${e.message}`));
      }
    }

    if (this.mainsPowered) {
      await this.setStoreValue('powerSource', 'mains').catch(() => {});
      await this.setStoreValue('battery', false).catch(() => {});
    }
  }

  _registerRelayCapabilityListener() {
    const config = this._getPresenceConfig();
    if (!config.hasRelay || !this.hasCapability('onoff') || this._relayListenerRegistered) {return;}

    try {
      this.registerCapabilityListener('onoff', async value => {
        const dp = Number(config.relayDp || 108);
        const sent = await this._sendPresenceDP(dp, value ? 1 : 0, config.relayType || 'enum');
        if (!sent) {throw new Error(`Relay DP${dp} write failed`);}
        return true;
      });
      this._relayListenerRegistered = true;
    } catch (err) {
      this.log('[RADAR] Relay listener registration failed:', err.message);
    }
  }

  async _sendPresenceDP(dp, value, type = 'value') {
    try {
      if (!this._presenceDPSender) {
        this._presenceDPSender = new UniversalDPSender(this);
      }
      return await this._presenceDPSender.sendTuyaDP(dp, value, type);
    } catch (err) {
      this.error(`[RADAR] DP${dp} send failed:`, err.message);
      return false;
    }
  }

  _getDPType(mapping = {}) {
    if (mapping.type === 'enum' || mapping.type === 'enum_onoff') {return 'enum';}
    if (mapping.type === 'bool' || mapping.type === 'presence_bool') {return 'bool';}
    return 'value';
  }

  _toDPValue(value, mapping = {}) {
    if (mapping.reverseEnumMap && Object.prototype.hasOwnProperty.call(mapping.reverseEnumMap, value)) {
      return mapping.reverseEnumMap[value];
    }
    if (mapping.divisor && typeof value === 'number') {
      return Math.round(value * mapping.divisor);
    }
    return value;
  }

  _handleDP(dpId, rawValue) {
    const dp = parseInt(dpId, 10);
    const config = this._getPresenceConfig();
    const mapping = config.dpMap?.[dp];

    if (mapping) {
      this._sendTimeSyncIfNeeded?.();
      this.updateRadioActivity?.();
      const value = this._parseValue ? this._parseValue(rawValue) : rawValue;
      return this._processStaticDP(dp, value, mapping, config);
    }

    return super._handleDP(dpId, rawValue);
  }

  /**
   * Primary entry point for Tuya DP processing
   */
  onTuyaDP(dpId, value, dpType) {
    const config = this._getPresenceConfig();
    const dp = parseInt(dpId, 10);
    const mapping = config.dpMap?.[dp];

    // 1. Static Configuration Match
    if (mapping) {
      const parsedValue = this._parseValue ? this._parseValue(value) : value;
      return this._processStaticDP(dp, parsedValue, mapping, config);
    }

    // 2. Intelligent Auto-Discovery Fallback
    const discovered = this._discovery.analyzeDP(dpId, value);
    if (discovered && discovered.confidence >= 60) {
      const result = this._discovery.applyDiscoveredValue(dpId, value);
      if (result) {
        this.log(`[RADAR] 🧠 Discovery: DP${dpId} → ${result.capability}=${result.value} (${result.confidence}%)`);
        return this.safeSetCapabilityValue(result.capability, result.value).catch(() => { });
      }
    }

    // 3. Diagnostic logging for unknown datapoints
    this.log(`[RADAR] 📊 Unknown DP${dpId} [type=${dpType}] = ${value}`);
  }

  /**
   * Process datapoints defined in configs.js
   */
  _processStaticDP(dpId, value, mapping, config) {
    // Presence / Motion
    if (mapping.cap === 'alarm_motion') {
      let presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      
      // Feed inference engine if enabled
      if (mapping.useInference) {
        presence = this._inference.updatePresenceDP(value);
      } else {
        this._inference.updatePresenceDP(value); // Tracking only
      }

      if (presence !== null) {
        this.safeSetCapabilityValue('alarm_human', presence).catch(() => {});
        return this.safeSetCapabilityValue('alarm_motion', presence).catch(() => {});
      }
      return;
    }

    // Distance tracking
    if (mapping.cap === 'measure_luminance.distance') {
      let distance;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        distance = smartParse(value, dpId, { capability: 'measure_luminance.distance' });
      } else {
        distance = value / (mapping.divisor || 100);
      }
      this._inference.updateDistance(distance);
      return this.safeSetCapabilityValue('measure_luminance.distance', distance).catch(() => {});
    }

    // Illuminance / Lux
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type !== 'lux_direct') {
        if (mapping.smartDivisor === true) {
          const { smartParse } = require('../../lib/managers/SmartDivisorManager');
          lux = smartParse(value, dpId, { capability: 'measure_luminance' });
        } else if (mapping.divisor) {
          lux = value / mapping.divisor;
        }
      }

      this._inference.updateLux(lux);
      return this.safeSetCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    if (mapping.cap === 'onoff') {
      const relayOn = mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)
        ? mapping.enumMap[value]
        : value === true || value === 1 || value === '1' || value === 'ON' || value === 'on';
      return this.safeSetCapabilityValue('onoff', !!relayOn).catch(() => {});
    }

    if (!mapping.cap && (mapping.setting || mapping.internal)) {
      const key = mapping.setting || mapping.internal;
      const finalValue = mapping.enumMap && Object.prototype.hasOwnProperty.call(mapping.enumMap, value)
        ? mapping.enumMap[value]
        : mapping.divisor && typeof value === 'number' ? value / mapping.divisor : value;
      this.setStoreValue(`radar_${key}`, finalValue).catch(() => {});
      return;
    }

    // Standard capability updates
    if (mapping.cap) {
      let finalValue;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        finalValue = smartParse(value, dpId, { capability: mapping.cap });
      } else {
        finalValue = mapping.divisor ? value / mapping.divisor : value;
      }
      return this.safeSetCapabilityValue(mapping.cap, finalValue).catch(() => {});
    }
  }

  /**
   * Radar-specific maintenance: Time sync and DP refresh
   */
  _startRadarCycle(zclNode) {
    // Time sync after 2s
    this.homey.setTimeout(() => { if (this._destroyed) return; this._syncTime(zclNode); }, 2000);

    // Initial DP query after 3s
    this.homey.setTimeout(() => { if (this._destroyed) return; this._refreshDPs(zclNode); }, 3000);

    if (this._getPresenceConfig().needsPolling === false) {
      this.log('[RADAR] Periodic DP polling disabled by device profile');
      return;
    }

    // Maintenance interval (60s)
    this._maintenanceTimer = this.homey.setInterval(() => { if (this._destroyed) return; this._refreshDPs(zclNode); }, 60000);
  }

  async _syncTime(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.tuya || ep?.clusters?.[61184];
      if (!cluster?.command) {return;}

      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utc = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const local = utc + (-new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utc, 0);
      payload.writeUInt32BE(local, 4);

      await cluster.command('mcuSyncTime', { payloadSize: 8, payload }).catch(() => {});
      this.log('[RADAR] ⏰ MCU Time Synced');
    } catch (e) {
      this.error('[RADAR] Time sync failed:', e.message);
    }
  }

  async _refreshDPs(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.tuya || ep?.clusters?.[61184];
      if (cluster?.dataQuery) {
        await cluster.dataQuery().catch(() => {});
      }
    } catch (e) {
      this.error('[RADAR] DP refresh failed:', e.message);
    }
  }

  /**
   * Handle settings synchronization
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    await super.onSettings({ oldSettings, newSettings, changedKeys });
    
    const config = this._getPresenceConfig();
    if (!config.dpMap) {return;}

    for (const key of changedKeys) {
      const dpId = Object.keys(config.dpMap).find(id => config.dpMap[id].setting === key);
      if (dpId) {
        let val = newSettings[key];
        const dpInfo = config.dpMap[dpId];
        val = this._toDPValue(val, dpInfo);
        const dpType = this._getDPType(dpInfo);
        
        this.log(`[RADAR] ⚙️ Sync Setting: ${key} → DP${dpId} (Value: ${val})`);
        const sent = await this._sendPresenceDP(parseInt(dpId, 10), val, dpType);
        if (!sent) {
          this.error(`[RADAR] Failed syncing ${key} to DP${dpId}`);
        }
      }
    }
  }

  onUninit() {
    if (this._maintenanceTimer) {this.homey.clearInterval(this._maintenanceTimer);}
    super.onUninit();
  }
}

module.exports = SensorIlluminancePresenceDevice;
