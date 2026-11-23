'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SceneSwitchWallDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class SceneSwitchWallDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    
    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[SCENE_SWITCH_WALL] [BTN] v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SceneSwitchWallDevice;
return module.exports;
});
