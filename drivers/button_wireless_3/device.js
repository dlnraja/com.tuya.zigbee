'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button 3 Gang - Universal Hardened Driver (v10.0.0)
 */
class Button3GangDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    this.buttonCount = 3;
    this.gangCount = 3; // Needed for PhysicalButtonMixin
    
    // Initialize physical button detection v5.13.6
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[BUTTON3] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = Button3GangDevice;
