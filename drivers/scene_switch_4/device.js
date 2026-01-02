'use strict';

// v5.5.351: FIX - Import error corrected (was using destructuring on non-destructured export)
// v5.5.319: Scene switches are BUTTON devices, not on/off switches!
// Eftychis report: "4 gang switches work only via iconic buttons. The real buttons do not react"
const ButtonDevice = require('../../lib/devices/ButtonDevice');

class SceneSwitch4Device extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.log('[SCENE-4] 🔘 Initializing 4-gang scene switch as BUTTON device...');

    // Set button count BEFORE calling super (ButtonDevice uses this)
    this.buttonCount = 4;

    await super.onNodeInit({ zclNode });
    this.log('[SCENE-4] ✅ Ready - physical buttons detected via scenes/onOff clusters');
  }
}

module.exports = SceneSwitch4Device;
