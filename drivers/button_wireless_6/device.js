'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * Button6GangDevice — TS0046 / 6-btn wall scene remote
 * P2609: hybrid RX fleet (ZCL + 0xFD + E000 + EF00 + raw)
 */
class Button6GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    this.gangCount = 6;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 6,
        tag: 'BUTTON_WIRELESS_6',
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_6] hybrid soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_6] hybrid wall remote ready (TS0046 class)');
  }

}

module.exports = Button6GangDevice;
