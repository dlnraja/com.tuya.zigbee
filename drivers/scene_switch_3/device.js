'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { installTs004xDedicatedComplement } = require('../../lib/devices/Ts004xDedicatedComplement');

/**
 * SceneSwitch3Device — 3-btn scene remote (TS0043 class)
 *
 * P2609/P2615: fleet hybrid RX + Homey Button 1–3 device view.
 * P2616: complementary dedicated LevelControl + P2328 parseZclHeader raw (P2520 UNION).
 */
class SceneSwitch3Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    const onPress = async (btn, press) => {
      if (typeof this.triggerButtonPress === 'function') {
        await this.triggerButtonPress(btn, press, 1, { source: 'physical' });
      } else if (typeof this._triggerPhysicalFlow === 'function') {
        await this._triggerPhysicalFlow(btn, press);
      }
    };

    // WHY(P2615): hybrid RX — Homey gap-fill for genOnOff 0xFD / E000 / EF00 / raw
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'SCENE_SWITCH_3',
        onPress,
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_3] hybrid soft-fail:', e.message);
    }

    // WHY(P2616 complementary): dedicated LevelControl + parseZclHeader — never wipe hybrid
    try {
      await installTs004xDedicatedComplement(this, zclNode, {
        maxButtons: 3,
        tag: 'SCENE_SWITCH_3',
        onPress,
        enableLevelControl: true,
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_3] dedicated complement soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_3] P2616 hybrid UNION dedicated; TX: no 0x8004; UI: Button N device view');
  }

}

module.exports = SceneSwitch3Device;
