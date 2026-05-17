'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Scene Switch 2 Gang - Universal Hardened Driver (v10.0.0)
 */
class SceneSwitch2Device extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.on();
    
    this.buttonCount = 2;
    this.gangCount = 2;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[SceneSwitch2] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = SceneSwitch2Device;
