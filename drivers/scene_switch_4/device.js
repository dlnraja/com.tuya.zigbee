'use strict';

// v5.5.319: FIX - Scene switches are BUTTON devices, not on/off switches!
// Eftychis report: "4 gang switches work only via iconic buttons. The real buttons do not react"
// Root cause: Was extending HybridSwitchBase (on/off) instead of ButtonDevice (buttons)
const { ButtonDevice } = require('../../lib/devices/ButtonDevice');

class SceneSwitch4Device extends ButtonDevice {
  get buttonCount() { return 4; }

  async onNodeInit({ zclNode }) {
    this.log('[SCENE-4] 🔘 Initializing 4-gang scene switch as BUTTON device...');
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-4] ✅ Ready - physical buttons now detected via scenes/onOff clusters');
  }
}
module.exports = SceneSwitch4Device;
