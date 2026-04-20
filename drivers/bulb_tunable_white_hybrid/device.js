'use strict';

// A8: NaN Safety - use safeDivide/safeMultiply
  require('../../lib/devices/UnifiedLightBase');

/**
 * Tunable White Bulb Device - v5.3.64 SIMPLIFIED
 */
class TunableWhiteBulbDevice extends UnifiedLightBase {

  get lightCapabilities() {
    return ['onoff', 'dim', 'light_temperature'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'dim', divisor: 1000, min: 0, max: 1 },
      3: { capability: 'light_temperature', divisor: 1000, min: 0, max: 1 }
    };
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
    this.log('[BULB]  Tunable white bulb ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = TunableWhiteBulbDevice;
