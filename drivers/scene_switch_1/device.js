'use strict';
const { HybridSwitchBase } = require('../../lib/devices/HybridSwitchBase');

class SceneSwitch1Device extends HybridSwitchBase {
  get gangCount() { return 1; }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[SCENE-1] ✅ Ready');
  }
}
module.exports = SceneSwitch1Device;
