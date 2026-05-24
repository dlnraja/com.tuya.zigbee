'use strict';

const UnifiedSwitchBase = require('./UnifiedSwitchBase');
const VirtualButtonMixin = require('../mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../mixins/PhysicalButtonMixin');

/**
 * HybridSwitchBase - v1.0.0
 * Unified base class for switches that support both physical and virtual buttons.
 * Combines UnifiedSwitchBase with VirtualButtonMixin and PhysicalButtonMixin.
 */
class HybridSwitchBase extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Initialize standard mixin features
    if (typeof this.initPhysicalButtonDetection === 'function') {
      await this.initPhysicalButtonDetection(zclNode);
    }
    
    if (typeof this.initVirtualButtons === 'function') {
      await this.initVirtualButtons();
    }
  }

}

module.exports = HybridSwitchBase;
