'use strict';

// v5.5.319: FIX - Scene switches are BUTTON devices, not on/off switches!
const { ButtonDevice } = require('../../lib/devices/ButtonDevice');

class SceneSwitch1Device extends ButtonDevice {
  get buttonCount() { return 1; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-1] 🔘 Initializing 1-gang scene switch as BUTTON device...');
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-1] ✅ Ready - physical button now detected');
  }
}
module.exports = SceneSwitch1Device;
