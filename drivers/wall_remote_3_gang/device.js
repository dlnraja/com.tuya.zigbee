'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote3GangDevice - 3-btn wall scene remote (TS0043 class)
 * P2609: hybrid RX fleet
 */
class WallRemote3GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'WALL_REMOTE_3',
      });
    } catch (e) {
      this.log('[WALL_REMOTE_3_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_3_GANG] hybrid ready');
  }

}

module.exports = WallRemote3GangDevice;
return module.exports;
});
