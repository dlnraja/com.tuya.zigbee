'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote1GangDevice — 1-btn wall scene remote (battery/mains)
 * P2609: hybrid RX fleet
 */
class WallRemote1GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.gangCount = 1;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 1,
        tag: 'WALL_REMOTE_1',
      });
    } catch (e) {
      this.log('[WALL_REMOTE_1_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_1_GANG] hybrid ready');
  }

}

module.exports = WallRemote1GangDevice;
