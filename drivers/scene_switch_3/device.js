'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch3Device - 3-btn scene remote (TS0043 class)
 * P2609: hybrid RX fleet
 */
class SceneSwitch3Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'SCENE_SWITCH_3',
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_3] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_3] hybrid ready');
  }

}

module.exports = SceneSwitch3Device;
return module.exports;
});
