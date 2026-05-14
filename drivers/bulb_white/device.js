'use strict';

constLightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * White Bulb Device - v5.3.64 SIMPLIFIED
 */
class WhiteBulbDevice extends LightBase {

  get mainsPowered() { return true; }

  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });
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
      this.log('[BULB] ✅ White bulb ready');
    }, 'onNodeInit');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = WhiteBulbDevice;
