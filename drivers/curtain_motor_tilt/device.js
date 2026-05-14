'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

constCoverBase = require('../../lib/devices/UnifiedCoverBase');

class CurtainMotorTiltDevice extends VirtualButtonMixin(PhysicalButtonMixin(CoverBase)) {
  get coverCapabilities() { return ['windowcoverings_state', 'windowcoverings_set', 'windowcoverings_tilt_set']; }
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
      this.log('[CURTAIN-TILT] ✅ Ready');
    }, 'onNodeInit');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = CurtainMotorTiltDevice;
