'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');

/**
 * PresenceSensorRadarDevice - v8.0.0 ULTIMATE
 * Universal Radar/mmWave sensor driver with intelligent inference and auto-discovery.
 */
class PresenceSensorRadarDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    // v5.11.139: Call super.onNodeInit() FIRST to initialize TuyaZigbeeDevice base class
    // which provides _safeInvoke and other L14 features
    await super.onNodeInit({ zclNode });
    
    this.log('[RADAR] 🚀 v8.0.0 Ultimate Initializing...');
    
    // Initialize v8 components
    this._inference = new IntelligentPresenceInference(this);
    this._discovery = new IntelligentDPAutoDiscovery(this);

      // Detect firmware version for inference tuning
      const appVersion = this.getStoreValue('appVersion') || this.zclNode.endpoints[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}

      // Start polling/refresh cycle
      this._startInitializationCycle(zclNode);

      this.log('[RADAR] ✅ Ready');
  }

  /**
   * Main Tuya DP processing entry point
   */
  onTuyaDP(dpId, value, dpType) {
    const config = getSensorConfig(this.getManufacturerName(), this.getStoreValue('modelId'));
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
      const distance = value / (mapping.divisor || 100);
      this._inference.updateDistance(distance);
      return this.setCapabilityValue('measure_luminance.distance', distance).catch(() => {});
    }

    // C. Handle illuminance DPs
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type === 'lux_direct') {lux = value;}
      else if (mapping.divisor) {lux = value / mapping.divisor;}
      
      this._inference.updateLux(lux);
      return this.setCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    // D. Handle battery DPs
    if (mapping.cap === 'measure_battery') {
      const battery = value / (mapping.divisor || 1);
      return this.setCapabilityValue('measure_battery', Math.min(100, battery)).catch(() => {});
    }
  }

  /**
   * Initialize polling and time sync
   */
  _startInitializationCycle(zclNode) {
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
    
    const config = getSensorConfig(this.getManufacturerName(), this.getStoreValue('modelId'));
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
