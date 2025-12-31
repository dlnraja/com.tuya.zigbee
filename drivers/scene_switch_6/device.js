'use strict';

// v5.5.319: FIX - Scene switches are BUTTON devices, not on/off switches!
const { ButtonDevice } = require('../../lib/devices/ButtonDevice');

class SceneSwitch6Device extends ButtonDevice {
  get buttonCount() { return 6; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-6] 🔘 Initializing 6-gang scene switch as BUTTON device...');
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-6] ✅ Ready - physical buttons now detected');
  }
}
module.exports = SceneSwitch6Device;
