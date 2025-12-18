'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class SceneSwitch2Device extends HybridSwitchBase {
  get gangCount() { return 2; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-2] ✅ Ready');
  }
}
module.exports = SceneSwitch2Device;
