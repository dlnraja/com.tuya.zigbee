'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

/**
 * Ceiling Presence Sensor Device - v7.0.x (MAX Local)
 * 
 * Re-architected to use UnifiedSensorBase for better Tuya DP stability
 * and dual-protocol support.
 */
class CeilingPresenceSensorDevice extends UnifiedSensorBase {

  /** 230V Mains powered */
  get mainsPowered() { return true; }

  /** Supported capabilities */
  get sensorCapabilities() {
    return ['alarm_motion', 'onoff', 'measure_luminance', 'measure_luminance.distance'];
  }

  /** DP Mappings for Ceiling Presence Radar */
  get dpMappings() {
    return {
      1: { capability: 'alarm_motion' },
      2: { setting: 'radar_sensitivity' },
      3: { setting: 'minimum_range', divisor: 100 },
      4: { setting: 'maximum_range', divisor: 100 },
      9: { capability: 'measure_luminance.distance', divisor: 100 },
      101: { capability: 'onoff' }, // Relay state
      102: { setting: 'fading_time' },
      104: { capability: 'measure_luminance' },
      105: { setting: 'indicator_mode' },
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[CEILING] Initializing Ceiling Presence Sensor (MAX Local/Hybrid)');
    
    // Initialize base hybrid logic
    await super.onNodeInit({ zclNode });
    this._registerCapabilityListeners(); // rule-12a injected

    // Register onoff listener for relay control
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[CEILING] Relay control: ${value}`);
      const tuya = zclNode.endpoints[1]?.clusters?.tuya;
      if (tuya?.datapoint) {
          await tuya.datapoint({ dp: 101, value: value ? 1 : 0, type: 'bool' });
      }
    });

    this.log('[CEILING] Initialization complete (Hybrid)');
  }

  /**
   * Override _handleAutoRelay logic if needed, 
   * but usually handled via Flow cards in Homey.
   */
}

module.exports = CeilingPresenceSensorDevice;

