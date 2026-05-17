'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Scene Switch 4 Gang - Universal Hardened Driver (v10.0.0)
 */
class SceneSwitch4Device extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.on();
    
    this.buttonCount = 4;
    this.gangCount = 4;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[SceneSwitch4] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = SceneSwitch4Device;
