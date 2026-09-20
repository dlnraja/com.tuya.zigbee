'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { installTs004xDedicatedComplement } = require('../../lib/devices/Ts004xDedicatedComplement');

/**
 * Button3GangDevice — battery wall scene remote (TS0043 / Zemismart / Moes / Lonsonho)
 *
 * P2608: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 DP + raw).
 * P2615: Homey Button 1–3 device view (maintenanceAction false).
 * P2616: complementary dedicated LevelControl + P2328 parseZclHeader (P2520 UNION).
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

    const onPress = async (btn, press) => {
      if (typeof this.triggerButtonPress === 'function') {
        await this.triggerButtonPress(btn, press, 1, { source: 'wall-hybrid-3' });
      } else if (typeof this._triggerPhysicalFlow === 'function') {
        await this._triggerPhysicalFlow(btn, press);
      }
    };

    // WHY(P2608/P2615): stick-on 3-btn wall remotes — multi-path RX + Homey UI pulse
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
        onPress,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] hybrid soft-fail:', e.message);
    }

    // WHY(P2616 complementary): LevelControl + P2328 raw — fallback for exotic white-labels
    try {
      await installTs004xDedicatedComplement(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
        onPress,
        enableLevelControl: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] dedicated complement soft-fail:', e.message);
    }

    this.log('[BUTTON_WIRELESS_3] P2616 hybrid UNION dedicated (TS0043); UI: Button N device view');
  }

}

module.exports = Button3GangDevice;
