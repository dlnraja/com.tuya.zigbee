'use strict';

const UnifiedLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * LED Controller RGB Device - v5.3.64 SIMPLIFIED
 */
class LEDControllerRGBDevice extends UnifiedLightBase {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  // WHY P2272: Z2M#32594 bjoccxbi RGB+CCT — brightness MCU 0–1000 (not /10)
  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000, min: 0, max: 1000 },
      3: { capability: 'light_temperature', divisor: 1000 },
      5: { capability: 'light_hue', divisor: 360 },
    };
  }

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_hue', 'light_saturation'];
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    this.log('[LED-RGB]  LED controller RGB ready');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = LEDControllerRGBDevice;
