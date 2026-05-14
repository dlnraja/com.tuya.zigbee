'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button 2 Gang - Universal Hardened Driver (v10.0.0)
 */
class Button2GangDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.onNodeInit();
    
    this.buttonCount = 2;
    this.gangCount = 2;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[BUTTON2] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = Button2GangDevice;
