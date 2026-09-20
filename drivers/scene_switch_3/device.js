'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch3Device — 3-btn scene remote (TS0043 class)
 * P2609: hybrid RX fleet · P2615: Homey Button 1–3 device view (not Maintenance)
 */
class SceneSwitch3Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    // WHY(P2615): hybrid RX — Homey gap-fill for genOnOff 0xFD / E000 / EF00 / raw
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'SCENE_SWITCH_3',
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_3] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_3] P2615 hybrid RX; TX: no 0x8004 on TS0043; UI: Button N device view');
  }

}

module.exports = SceneSwitch3Device;
