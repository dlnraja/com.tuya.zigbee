'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * Button2GangDevice — TS0042 / 2-btn wall scene remote (battery or USB)
 * P2609: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 + raw)
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.gangCount = 2;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    // WHY(P2609): E000-only was incomplete — AliExpress 2-btn stickies use 0xFD + EF00 too
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 2,
        tag: 'BUTTON_WIRELESS_2',
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_2] hybrid soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_2] hybrid wall remote ready (TS0042 class)');
  }

}

module.exports = Button2GangDevice;
