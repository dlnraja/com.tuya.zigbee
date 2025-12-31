'use strict';

// v5.5.319: FIX - Scene switches are BUTTON devices, not on/off switches!
const { ButtonDevice } = require('../../lib/devices/ButtonDevice');

class SceneSwitch3Device extends ButtonDevice {
  get buttonCount() { return 3; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-3] 🔘 Initializing 3-gang scene switch as BUTTON device...');
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-3] ✅ Ready - physical buttons now detected');
  }
}
module.exports = SceneSwitch3Device;
