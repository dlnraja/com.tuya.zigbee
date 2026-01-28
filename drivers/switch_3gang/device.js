'use strict';
const HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 3-GANG SWITCH - v5.5.896 + PhysicalButtonMixin
 * Physical button detection: single/double/long/triple per gang
 */
class Switch3GangDevice extends PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) {
  get gangCount() { return 3; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[SWITCH-3G] v5.5.896 - Physical button detection enabled');
  }
}
module.exports = Switch3GangDevice;
