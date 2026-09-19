'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch2Device — 2-btn scene remote
 * P2609: hybrid RX fleet
 */
class SceneSwitch2Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.gangCount = 2;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 2,
        tag: 'SCENE_SWITCH_2',
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_2] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_2] hybrid ready');
  }

}

module.exports = SceneSwitch2Device;
