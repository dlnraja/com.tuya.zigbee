'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');
const MfrHelper = require('../../lib/helpers/ManufacturerNameHelper');

/**
 * Known mains-powered mmWave radar manufacturers (230V AC ceiling/wall radars).
 * These devices report battery DPs but are actually mains-powered.
 */
const MAINS_POWERED_RADARS = new Set([
  '_tze204_clrdrnya',
  '_tze200_clrdrnya',
  '_tze200_lyetpprm',
  '_tze204_lyetpprm',
  '_tze200_wukb7rhc',
  '_tze204_wukb7rhc',
  '_tze200_jva8ink8',
  '_tze204_jva8ink8',
]);

/**
 * PresenceSensorRadarDevice - v8.0.0 ULTIMATE
 * Universal Radar/mmWave sensor driver with intelligent inference and auto-discovery.
 */
class PresenceSensorRadarDevice extends UnifiedSensorBase {

  /**
   * Override: Mains-powered radars should not be treated as battery devices.
   * This suppresses battery polling, periodic dataQuery, and adjusts reporting intervals.
   */
  get mainsPowered() {
    const config = this._getRadarConfig();
    if (config && config.mainsPowered) return true;
    const mfr = (MfrHelper.getManufacturerName(this) || '').toLowerCase();
    return MAINS_POWERED_RADARS.has(mfr);
  }

  /**
   * Cache the radar config lookup to avoid repeated calls.
   */
  _getRadarConfig() {
    if (!this._cachedRadarConfig) {
      this._cachedRadarConfig = getSensorConfig(MfrHelper.getManufacturerName(this), this.getStoreValue('modelId'));
    }
    return this._cachedRadarConfig;
  }

  async onNodeInit({ zclNode }) {
    // v5.11.139: Call super.onNodeInit() FIRST to initialize TuyaZigbeeDevice base class
    // which provides _safeInvoke and other L14 features
    try {
      await super.onNodeInit({ zclNode });
    } catch (err) {
      this.log('[RADAR] Base init error:', err.message);
    }

    this.log('[RADAR] v8.0.0 Ultimate Initializing...');

    // Initialize v8 components
    this._inference = new IntelligentPresenceInference(this);
    this._discovery = new IntelligentDPAutoDiscovery(this);

    try {
      const appVersion = this.getStoreValue('appVersion') || this.zclNode?.endpoints?.[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}
    } catch (e) {
      this.log('[RADAR] Firmware detection failed:', e.message);
    }

    // Start polling/refresh cycle
    this._startInitializationCycle(zclNode);

    this.log('[RADAR] Ready');
  }

  /**
   * Main Tuya DP processing entry point
   */
  onTuyaDP(dpId, value, dpType) {
    const config = this._getRadarConfig();
    const mapping = config.dpMap?.[dpId];

    // 1. Process via static config if matched
    if (mapping) {
      return this._handleStaticDP(dpId, value, mapping, config);
    }

    // 2. Fallback: Intelligent Auto-Discovery
    const discovered = this._discovery.analyzeDP(dpId, value);
    if (discovered && discovered.confidence >= 60) {
      const result = this._discovery.applyDiscoveredValue(dpId, value);
      if (result) {
        this.log(`[RADAR] 🧠 Auto-Discovery: DP${dpId} → ${result.capability}=${result.value} (${result.confidence}%)`);
        return this.setCapabilityValue(result.capability, result.value).catch(() => { });
      }
    }

    // 3. Diagnostic logging for unknown DPs
    this.log(`[RADAR] 📊 Unknown DP${dpId} [type=${dpType}] = ${value}`);
  }

  /**
   * Handle DPs defined in the SENSOR_CONFIGS
   */
  _handleStaticDP(dpId, value, mapping, config) {
    // A. Handle presence DPs
    if (mapping.cap === 'alarm_motion') {
      let presence = transformPresence(value, mapping.type, config.invertPresence, config.configName);
      
      // Integrate with inference engine if needed
      if (mapping.useInference) {
        presence = this._inference.updatePresenceDP(value);
      } else {
        this._inference.updatePresenceDP(value); // Keep in sync
      }

      if (presence !== null) {
        return this.setCapabilityValue('alarm_motion', presence).catch(() => {});
      }
      return;
    }

    // B. Handle distance DPs (feed inference)
    if (mapping.cap === 'measure_luminance.distance') {
      let distance;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        distance = smartParse(value, dpId, { capability: 'measure_luminance.distance' });
      } else {
        distance = value / (mapping.divisor || 100);
      }
      this._inference.updateDistance(distance);
      return this.setCapabilityValue('measure_luminance.distance', distance).catch(() => {});
    }

    // C. Handle illuminance DPs
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type === 'lux_direct') {lux = value;}
      else if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        lux = smartParse(value, dpId, { capability: 'measure_luminance' });
      } else if (mapping.divisor) {lux = value / mapping.divisor;}

      this._inference.updateLux(lux);
      return this.setCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    // D. Handle battery DPs - ignore for mains-powered radars
    if (mapping.cap === 'measure_battery') {
      if (this.mainsPowered) {
        this.log(`[RADAR] ⏭️ Ignoring battery DP${dpId} on mains-powered radar`);
        return;
      }
      let battery;
      if (mapping.smartDivisor === true) {
        const { smartParse } = require('../../lib/managers/SmartDivisorManager');
        battery = smartParse(value, dpId, { capability: 'measure_battery' });
      } else {
        battery = value / (mapping.divisor || 1);
      }
      return this.setCapabilityValue('measure_battery', Math.min(100, battery)).catch(() => {});
    }
  }

  /**
   * Initialize polling and time sync
   */
  _startInitializationCycle(zclNode) {
    if (!zclNode?.endpoints?.[1]) {
      this.log('[RADAR] No endpoint 1 available - deferring initialization');
      // Retry after delay for connection failures
      setTimeout(() => {
        if (this._destroyed) {return;}
        this.log('[RADAR] Retrying initialization after connection delay...');
        try {
          this._sendTimeSync(zclNode);
          this._requestDPRefresh(zclNode);
        } catch (e) {
          this.log('[RADAR] Deferred init failed:', e.message);
        }
      }, 5000);
      return;
    }

    // 1. Time Sync
    this.homey.setTimeout(() => this._sendTimeSync(zclNode), 2000);

    // 2. DP Refresh
    this.homey.setTimeout(() => this._requestDPRefresh(zclNode), 3000);

    // 3. Periodic polling (60s)
    this._pollingInterval = this.homey.setInterval(() => {
      this._requestDPRefresh(zclNode);
    }, 60000);
  }

  /**
   * Logic for sending time sync to Tuya devices
   */
  async _sendTimeSync(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (!tuya || !tuya.command) {return;}

      const ZIGBEE_EPOCH = new Date(Date.UTC(2000, 0, 1, 0, 0, 0)).getTime();
      const utcSeconds = Math.floor((Date.now() - ZIGBEE_EPOCH) / 1000);
      const localSeconds = utcSeconds + (-new Date().getTimezoneOffset() * 60);

      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcSeconds, 0);
      payload.writeUInt32BE(localSeconds, 4);

      await tuya.command('mcuSyncTime', { payloadSize: 8, payload }).catch(() => {});
      this.log('[RADAR] ⏰ Time sync sent');
    } catch (e) {
      this.error('[RADAR] Time sync failed:', e.message);
    }
  }

  async _requestDPRefresh(zclNode) {
    try {
      const ep1 = zclNode?.endpoints?.[1];
      const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[61184];
      if (tuya?.dataQuery) {
        await tuya.dataQuery().catch(() => {});
      }
    } catch (e) {
      this.error('[RADAR] DP refresh failed:', e.message);
    }
  }

  /**
   * Handle settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (super.onSettings) {await super.onSettings({ oldSettings, newSettings, changedKeys });}
    
    const config = this._getRadarConfig();
    if (!config.dpMap) {return;}

    for (const key of changedKeys) {
      const dpId = Object.keys(config.dpMap).find(id => config.dpMap[id].setting === key);
      if (dpId) {
        let value = newSettings[key];
        const dpConfig = config.dpMap[dpId];
        if (dpConfig.divisor) {value = Math.round(value * dpConfig.divisor);}
        
        this.log(`[RADAR] ⚙️ Syncing ${key} → DP${dpId} value=${value}`);
        if (this.sendTuyaCommand) {
          await this.sendTuyaCommand(parseInt(dpId), value, 'value').catch(e => this.error(e));
        }
      }
    }
  }

  onUninit() {
    if (this._pollingInterval) {this.homey.clearInterval(this._pollingInterval);}
    if (super.onUninit) {super.onUninit();}
  }

  onDeleted() {
    this.log('[RADAR] Device deleted');
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = PresenceSensorRadarDevice;
