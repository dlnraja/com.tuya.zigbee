'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SceneSwitch6Device - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class SceneSwitch6Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    
    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[SCENE_SWITCH_6] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SceneSwitch6Device;
