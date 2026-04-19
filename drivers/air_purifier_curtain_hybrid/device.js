'use strict';
const UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');

class CurtainMotorTiltDevice extends UnifiedCoverBase {
  get coverCapabilities() { return ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set']; }
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
    this.log('[CURTAIN-TILT]  Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = CurtainMotorTiltDevice;
