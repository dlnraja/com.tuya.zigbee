'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch1Device - 1-btn scene remote
 * P2609: hybrid RX fleet
 */
class SceneSwitch1Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.gangCount = 1;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 1,
        tag: 'SCENE_SWITCH_1',
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_1] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_1] hybrid ready');
  }

}

module.exports = SceneSwitch1Device;
return module.exports;
});
