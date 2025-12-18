'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class SceneSwitch6Device extends HybridSwitchBase {
  get gangCount() { return 6; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-6] ✅ Ready');
  }
}
module.exports = SceneSwitch6Device;
