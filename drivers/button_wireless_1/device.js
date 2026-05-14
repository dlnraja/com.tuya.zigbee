'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Button 1 Gang - Universal Hardened Driver (v10.0.0)
 * 
 * Standardized on TuyaZigbeeDevice + PhysicalButtonMixin for:
 * - 9-Layer Architecture (L1-L9)
 * - Intelligent Battery Management
 * - Scene Mode Auto-Switching & Recovery
 */
class Button1GangDevice extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.onNodeInit();
    
    this.buttonCount = 1;
    this.gangCount = 1;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[BUTTON1] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = Button1GangDevice;
