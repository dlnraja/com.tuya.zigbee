'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class SceneSwitch3Device extends HybridSwitchBase {
  get gangCount() { return 3; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-3] ✅ Ready');
  }
}
module.exports = SceneSwitch3Device;
