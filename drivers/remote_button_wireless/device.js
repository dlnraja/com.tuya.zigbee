'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * RemoteButtonWirelessDevice — multi-btn wireless remote (TS0043 class default)
 * P2609: hybrid RX fleet
 */
class RemoteButtonWirelessDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'REMOTE_BUTTON_WIRELESS',
      });
    } catch (e) {
      this.log('[REMOTE_BUTTON_WIRELESS] hybrid soft-fail:', e.message);
    }

    this.log('[REMOTE_BUTTON_WIRELESS] hybrid ready');
  }

}

module.exports = RemoteButtonWirelessDevice;
