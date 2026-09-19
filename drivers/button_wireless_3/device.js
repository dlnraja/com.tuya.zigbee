'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * Button3GangDevice — battery wall scene remote (TS0043 / Zemismart / Moes / Lonsonho)
 *
 * P2608: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 DP + raw) — same class as
 * scene_switch_4 / button_wireless_4. Never write genOnOff 0x8004 on TS0043.
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    // WHY(P2608): Bastien house priority — stick-on 3-btn wall remotes need multi-path RX
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] hybrid soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_3] hybrid wall remote ready (TS0043 class)');
  }

}

module.exports = Button3GangDevice;
