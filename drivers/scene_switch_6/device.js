'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch6Device — 6-btn scene switch/remote
 * P2609: hybrid RX fleet
 */
class SceneSwitch6Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    this.gangCount = 6;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 6,
        tag: 'SCENE_SWITCH_6',
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_6] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_6] hybrid ready');
  }

}

module.exports = SceneSwitch6Device;
