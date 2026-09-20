'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * Button3GangDevice — battery wall scene remote (TS0043 / Zemismart / Moes / Lonsonho)
 *
 * P2608: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 DP + raw).
 * P2615: Homey Button 1–3 device view (maintenanceAction false).
 * Never write genOnOff 0x8004 on TS0043. Sacred: _TZ3000_a7ouggvs+TS0043.
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

    // WHY(P2608/P2615): stick-on 3-btn wall remotes — multi-path RX + Homey UI pulse
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] hybrid soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_3] P2615 hybrid ready (TS0043); UI: Button N device view');
  }

}

module.exports = Button3GangDevice;
