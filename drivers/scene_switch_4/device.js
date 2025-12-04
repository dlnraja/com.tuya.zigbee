'use strict';
const { HybridSwitchBase } = require('../../lib/devices');

class SceneSwitch4Device extends HybridSwitchBase {
  get gangCount() { return 4; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-4] ✅ Ready');
  }
}
module.exports = SceneSwitch4Device;
