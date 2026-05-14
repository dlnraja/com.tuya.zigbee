'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Scene Switch 6 Gang - Universal Hardened Driver (v10.0.0)
 */
class SceneSwitch6Device extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.onNodeInit();
    
    this.buttonCount = 6;
    this.gangCount = 6;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[SceneSwitch6] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = SceneSwitch6Device;
