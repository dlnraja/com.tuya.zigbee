'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * Button4GangHandheldDevice — 4-btn handheld scene remote
 * P2609: hybrid RX fleet
 */
class Button4GangHandheldDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.gangCount = 4;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'REMOTE_HANDHELD_4',
      });
    } catch (e) {
      this.log('[REMOTE_BUTTON_WIRELESS_HANDHELD] hybrid soft-fail:', e.message);
    }

    this.log('[REMOTE_BUTTON_WIRELESS_HANDHELD] hybrid ready');
  }

}

module.exports = Button4GangHandheldDevice;
