'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote6GangDevice — 6-btn wall scene remote (TS0046 class)
 * P2609: hybrid RX fleet
 */
class WallRemote6GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    this.gangCount = 6;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 6,
        tag: 'WALL_REMOTE_6',
      });
    } catch (e) {
      this.log('[WALL_REMOTE_6_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_6_GANG] hybrid ready');
  }

}

module.exports = WallRemote6GangDevice;
