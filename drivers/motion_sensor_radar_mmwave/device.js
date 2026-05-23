'use strict';

const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { smartParse } = require('../../lib/managers/SmartDivisorManager');
const IntelligentPresenceInference = require('../../lib/sensors/IntelligentPresenceInference');

/**
 * Motion Sensor Radar mmWave Device - v8.0.0 MODERNIZED
 * Advanced mmWave radar driver with decoupled inference and autonomous discovery.
 */
class MotionSensorRadarDevice extends UnifiedSensorBase {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      this.log('[MMWAVE] 🚀 v8.0.0 Modernizing...');
      
      // Initialize v8 components
      this._inference = new IntelligentPresenceInference(this);
      
      // Parent handles standard sensor logic and discovery initialization
      await super.onNodeInit({ zclNode });

      // Setup firmware info for inference tuning
      const appVersion = this.getStoreValue('appVersion') || this.zclNode.endpoints[1]?.clusters?.basic?.appVersion;
      if (appVersion) {this._inference.setFirmwareInfo(appVersion);}

      // Configure continuous illuminance reporting
      await this._configureIlluminanceReporting();

      this.log('[MMWAVE] ✅ Ready');
    }, 'onNodeInit');
  }

  // Configure illuminance reporting independently from motion
  async _configureIlluminanceReporting() {
    try {
      if (this.zclNode && this.zclNode.endpoints[1] && this.zclNode.endpoints[1].clusters.illuminanceMeasurement) {
        const illuminanceCluster = this.zclNode.endpoints[1].clusters.illuminanceMeasurement;
        await illuminanceCluster.configureReporting({
          measuredValue: {
            minInterval: 30,      // 30 seconds minimum
            maxInterval: 300,     // 5 minutes maximum
            minChange: 50         // 50 lux minimum change
          }
        });
        this.log('[MMWAVE] ✅ Illuminance reporting configured for continuous updates');
      }
    } catch (error) {
      this.log('[MMWAVE] ❌ Failed to configure illuminance reporting:', error.message);
    }
  }

  get sensorCapabilities() {
    return ['alarm_motion', 'measure_luminance.distance', 'measure_luminance', 'measure_battery'];
  }

  /**
   * Main Tuya DP processing
   */
  onTuyaDP(dpId, value, dpType) {
    this.log(`[MMWAVE] 📥 DP${dpId} = ${value}`);

    // 1. Static Mappings
    switch (dpId) {
      case 1: // Presence / Motion
        const presence = this._inference.updatePresenceDP(value);
        return this.setCapabilityValue('alarm_motion', presence).catch(() => { });

      case 9: // Distance (cm to m)
      case 102:
        const distance = smartParse(value, null, { capability: 'measure_temperature' });
        this._inference.updateDistance(distance);
        return this.setCapabilityValue('measure_luminance.distance', distance).catch(() => {});

      case 12: // Illuminance
      case 104:
        const lux = value;
        this._inference.updateLux(lux);
        return this.setCapabilityValue('measure_luminance', lux).catch(() => {});

      case 4: // Battery
      case 15:
        return this.setCapabilityValue('measure_battery', value).catch(() => {});
    }

    // 2. Fallback to heuristic discovery (handled by base class)
    if (this.universalDataHandler) {
      // In UnifiedSensorBase, handleDP usually takes care of it, 
      // but if we override onTuyaDP we should make sure fallbacks work.
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    for (const key of changedKeys) {
      const val = newSettings[key];
      switch (key) {
        case 'radar_sensitivity': 
          await this.sendTuyaCommand(9, val, 'value').catch(() => {}); 
          break;
        case 'minimum_range': 
          await this.sendTuyaCommand(10, Math.round(val * 100), 'value').catch(() => {}); 
          break;
        case 'maximum_range': 
          await this.sendTuyaCommand(11, Math.round(val * 100), 'value').catch(() => {}); 
          break;
        case 'fading_time': 
          await this.sendTuyaCommand(104, val, 'value').catch(() => {}); 
          break;
      }
    }
  }
}

module.exports = MotionSensorRadarDevice;
