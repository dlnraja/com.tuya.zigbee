'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button 4 Gang - Universal Hardened Driver (v10.0.0)
 */
class Button4GangDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.on();
    
    this.buttonCount = 4;
    this.gangCount = 4; // Needed for PhysicalButtonMixin
    
    // Initialize physical button detection v5.13.6
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[BUTTON4] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = Button4GangDevice;
