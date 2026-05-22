'use strict';
const LightBase = require('../../lib/devices/UnifiedLightBase');

/**
 * White Bulb Device - v5.3.64 SIMPLIFIED
 */
class WhiteBulbDevice extends LightBase {

  get mainsPowered() { return true; }

  get lightCapabilities() {
    return ['onoff', 'dim'];
  }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => {
      await super.onNodeInit({ zclNode });

      // --- Attribute Reporting Configuration ---
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

      this.log('[BULB] ✅ White bulb ready');
    }, 'onNodeInit');
  }

  onDeleted() {
    this.log('Device deleted, cleaning up');
    if (super.onDeleted) {super.onDeleted();}
  }
}

module.exports = WhiteBulbDevice;
