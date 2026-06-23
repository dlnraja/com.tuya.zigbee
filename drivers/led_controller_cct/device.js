'use strict';

// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/devices/UnifiedLightBase');

/**
 * LED Controller CCT Device - v5.3.64 SIMPLIFIED
 * Fixes issue #83: TS0501B dimming
 */
class LEDControllerCCTDevice extends UnifiedLightBase {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_temperature'];
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
    this.log('[LED-CCT]  LED controller CCT ready');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = LEDControllerCCTDevice;
