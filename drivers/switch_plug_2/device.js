'use strict';
const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class SwitchPlug2Device extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {
  /**
   * EXTEND parent dpMappings with energy monitoring DPs
   */
  get dpMappings() {
    const parentMappings = Object.getPrototypeOf(Object.getPrototypeOf(this)).dpMappings || {};
    return {
      ...parentMappings,
      17: { capability: 'measure_current', smartDivisor: true },   // mA → A
      18: { capability: 'measure_power', smartDivisor: true },     // W * 10
      19: { capability: 'measure_voltage', smartDivisor: true },   // V * 10
      20: { capability: 'meter_power', smartDivisor: true }        // kWh * 100
    };
  }

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
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[SWITCH-PLUG-2]  Ready (v5.13.1 + Bidirectional Buttons)');
  }


  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SwitchPlug2Device;
