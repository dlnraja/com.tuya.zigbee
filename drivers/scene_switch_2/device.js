'use strict';

// v5.5.319: FIX - Scene switches are BUTTON devices, not on/off switches!
const { ButtonDevice } = require('../../lib/devices/ButtonDevice');

class SceneSwitch2Device extends ButtonDevice {
  get buttonCount() { return 2; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-2] 🔘 Initializing 2-gang scene switch as BUTTON device...');
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-2] ✅ Ready - physical buttons now detected');
  }
}
module.exports = SceneSwitch2Device;
