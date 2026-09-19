'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch1Device — 1-btn scene remote
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
