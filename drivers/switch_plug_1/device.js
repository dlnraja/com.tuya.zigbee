'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class SwitchPlug1Device extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        },
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
    this.initPhysicalButtonDetection(); // rule-19 injected
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[SWITCH-PLUG-1] ✅ Ready (v5.13.1 + Bidirectional Buttons)');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SwitchPlug1Device;
