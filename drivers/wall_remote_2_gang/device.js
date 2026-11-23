'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote2GangDevice - 2-btn wall scene remote
 * P2609: hybrid RX fleet
 */
class WallRemote2GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.gangCount = 2;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 2,
        tag: 'WALL_REMOTE_2',
      });
    } catch (e) {
      this.log('[WALL_REMOTE_2_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_2_GANG] hybrid ready');
  }

}

module.exports = WallRemote2GangDevice;
return module.exports;
});
