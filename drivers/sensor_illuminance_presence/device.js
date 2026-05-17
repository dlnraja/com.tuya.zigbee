'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { getSensorConfig, transformPresence } = require('./configs');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/sensors/IntelligentDPAutoDiscovery');

/**
 * SensorIlluminancePresenceDevice - v8.0.0
 * Gold Standard Refactor: Unified architecture for Multi-Sensor Radar/Presence devices.
 * Features: Intelligent Inference, Auto-Discovery, and SDK3 Lifecycle Management.
 */
class SensorIlluminancePresenceDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[RADAR] 🚀 v8.0.0 Refactor Initializing...');
      
      // Initialize Advanced Components
      this._inference = new IntelligentPresenceInference(this);
      this._discovery = new IntelligentDPAutoDiscovery(this);
      
      // Standard Sensor Initialization
      await super.onNodeInit({ zclNode });

      // Detect firmware for inference tuning
      const appVersion = this.getStoreValue('appVersion') || this.zclNode.endpoints[1]?.clusters?.basic?.appVersion;
      if (appVersion) this._inference.setFirmwareInfo(appVersion);

      // Start device-specific maintenance cycles
      this._startRadarCycle(zclNode);

      this.log('[RADAR] ✅ Ready');
    }, 'onNodeInit');
  }

  /**
   * Primary entry point for Tuya DP processing
   */
  onTuyaDP(dpId, value, dpType) {
    const config = getSensorConfig(this.getManufacturerName(), this.getStoreValue('modelId'));
    const mapping = config.dpMap?.[dpId];

    // 1. Static Configuration Match
    if (mapping) {
      return this._processStaticDP(dpId, value, mapping, config);
    }

    // 2. Intelligent Auto-Discovery Fallback
    const discovered = this._discovery.analyzeDP(dpId, value);
    if (discovered && discovered.confidence >= 60) {
      const result = this._discovery.applyDiscoveredValue(dpId, value);
      if (result) {
        this.log(`[RADAR] 🧠 Discovery: DP${dpId} → ${result.capability}=${result.value} (${result.confidence}%)`);
        return this.setCapabilityValue(result.capability, result.value).catch(() => { });
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
        return this.setCapabilityValue('alarm_motion', presence).catch(() => {});
      }
      return;
    }

    // Distance tracking
    if (mapping.cap === 'measure_luminance.distance') {
      const distance = value / (mapping.divisor || 100);
      this._inference.updateDistance(distance);
      return this.setCapabilityValue('measure_luminance.distance', distance).catch(() => {});
    }

    // Illuminance / Lux
    if (mapping.cap === 'measure_luminance') {
      let lux = value;
      if (mapping.type !== 'lux_direct' && mapping.divisor) {
        lux = value / mapping.divisor;
      }
      
      this._inference.updateLux(lux);
      return this.setCapabilityValue('measure_luminance', lux).catch(() => {});
    }

    // Standard capability updates
    if (mapping.cap) {
      const finalValue = mapping.divisor ? value / mapping.divisor : value;
      return this.setCapabilityValue(mapping.cap, finalValue).catch(() => {});
    }
  }

  /**
   * Radar-specific maintenance: Time sync and DP refresh
   */
  _startRadarCycle(zclNode) {
    // Time sync after 2s
    this.homey.setTimeout(() => this._syncTime(zclNode), 2000);

    // Initial DP query after 3s
    this.homey.setTimeout(() => this._refreshDPs(zclNode), 3000);

    // Maintenance interval (60s)
    this._maintenanceTimer = this.homey.setInterval(() => {
      this._refreshDPs(zclNode);
    }, 60000);
  }

  async _syncTime(zclNode) {
    try {
      const ep = zclNode?.endpoints?.[1];
      const cluster = ep?.clusters?.tuya || ep?.clusters?.[61184];
      if (!cluster?.command) return;

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
    
    const config = getSensorConfig(this.getManufacturerName(), this.getStoreValue('modelId'));
    if (!config.dpMap) return;

    for (const key of changedKeys) {
      const dpId = Object.keys(config.dpMap).find(id => config.dpMap[id].setting === key);
      if (dpId) {
        let val = newSettings[key];
        const dpInfo = config.dpMap[dpId];
        if (dpInfo.divisor) val = Math.round(val * dpInfo.divisor);
        
        this.log(`[RADAR] ⚙️ Sync Setting: ${key} → DP${dpId} (Value: ${val})`);
        if (this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(parseInt(dpId), val, 'value').catch(e => this.error(e));
        }
      }
    }
  }

  onUninit() {
    if (this._maintenanceTimer) this.homey.clearInterval(this._maintenanceTimer);
    super.onUninit();
  }
}

module.exports = SensorIlluminancePresenceDevice;
