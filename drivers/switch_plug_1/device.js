'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

class SwitchPlug1Device extends PhysicalButtonMixin(VirtualButtonMixin(HybridPlugBase)) {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    await this.initPhysicalButtonDetection(zclNode);
    await this.initVirtualButtons();
    this.log('[SWITCH-PLUG-1] ✅ Ready (v5.13.1 + Bidirectional Buttons)');
  }
}
module.exports = SwitchPlug1Device;
