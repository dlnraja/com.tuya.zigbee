'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

class Switch3GangDevice extends VirtualButtonMixin(HybridSwitchBase) {
  get gangCount() { return 3; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.initVirtualButtons();
    this.log('[SWITCH-3G] v5.5.412 ✅ Ready + virtual buttons');
  }
}
module.exports = Switch3GangDevice;
