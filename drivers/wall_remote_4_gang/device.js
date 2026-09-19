'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote4GangDevice — 4-btn wall scene remote (TS0044 class)
 * P2609: hybrid RX fleet
 */
class WallRemote4GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.gangCount = 4;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'WALL_REMOTE_4',
      });
    } catch (e) {
      this.log('[WALL_REMOTE_4_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_4_GANG] hybrid ready');
  }

}

module.exports = WallRemote4GangDevice;
