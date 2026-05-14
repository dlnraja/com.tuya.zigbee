'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Scene Switch 1 Gang - Universal Hardened Driver (v10.0.0)
 */
class SceneSwitch1Device extends PhysicalButtonMixin(TuyaZigbeeDevice) {

  async onNodeInit() {
    await super.onNodeInit();
    
    this.buttonCount = 1;
    this.gangCount = 1;
    
    // Initialize hardened physical button detection
    await this.initPhysicalButtonDetection(this.zclNode);
    
    this.log('[SceneSwitch1] 🔘 Hardened via TuyaZigbeeDevice + PhysicalButtonMixin');
  }

}

module.exports = SceneSwitch1Device;
