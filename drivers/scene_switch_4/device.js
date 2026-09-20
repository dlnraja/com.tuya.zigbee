'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * SceneSwitch4Device — TS0044 / TS1002 / ZG-101ZS 4-btn scene remotes
 *
 * WHY(P2614): Homey charter = Button 1–4 in device view (not Maintenance).
 * Hybrid RX (shared with wall_remote_4): genOnOff 0xFD + E000 + EF00 DP + raw.
 * TX: never genOnOff 0x8004 on TS0044 (DeviceOperatingMode family ts0044).
 * Sacred examples: _TZ3000_zgyzgdua+TS0044 (meter91), _TZ3000_wkai4ga5+TS0044.
 */
class SceneSwitch4Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.gangCount = 4;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    // WHY P2277: Arlight TS1002 (_TZ3000_te34fjg4) is mains 230V scene panel — strip phantom battery
    const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '').toLowerCase();
    const pid = String(this.getSetting?.('zb_model_id') || this.getData?.()?.modelId || '').toUpperCase();
    if (mfr.includes('te34fjg4') || pid === 'TS1002') {
      await this.removeCapability('measure_battery').catch(() => {});
      await this.removeCapability('alarm_battery').catch(() => {});
    }

    // WHY(P2614): fleet hybrid — ZCL onOff / mfr 0xFD / E000 / EF00 / raw (Homey gap-fill)
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'SCENE_SWITCH_4',
        onPress: async (btn, press) => {
          await this._triggerSceneSwitch4(btn, press);
        },
      });
    } catch (e) {
      this.log('[SCENE_SWITCH_4] hybrid soft-fail:', e.message);
    }

    this.log('[SCENE_SWITCH_4] P2614 hybrid RX: OnOff-0xFD + E000 + EF00 + raw; TX: no 0x8004 on TS0044; UI: Button N device view');
  }

  /**
   * Physical press → flows + Homey UI pulse (P2492 via triggerButtonPress / mixin).
   */
  async _triggerSceneSwitch4(button, pressType) {
    if (typeof this.triggerButtonPress === 'function') {
      await this.triggerButtonPress(
        button,
        pressType === 'long_press' ? 'long' : pressType,
        1,
        { source: 'physical' },
      );
      return;
    }
    if (typeof this._triggerPhysicalFlow === 'function') {
      this._triggerPhysicalFlow(button, pressType);
      return;
    }

    // WHY(P2283/P2332): compose uses scene_switch_4_button_{N}_{pressed|double|long}
    try {
      const suffix = pressType === 'single' || pressType === 'pressed' ? 'pressed'
        : (pressType === 'double' || pressType === 'double_press') ? 'double'
          : (pressType === 'long' || pressType === 'long_press') ? 'long'
            : String(pressType || 'pressed');
      const typeMap = { pressed: 'single', double: 'double', long: 'long' };
      if (typeof this.triggerButtonPress === 'function') {
        await this.triggerButtonPress(button, typeMap[suffix] || 'single', 1, { source: 'e000-s4' });
        return;
      }
      const candidates = [
        `scene_switch_4_button_${button}_${suffix}`,
        `scene_switch_4_button_4gang_button_${button}_${suffix}`,
        suffix === 'pressed' ? 'scene_switch_4_button_pressed'
          : suffix === 'double' ? 'scene_switch_4_button_double_press'
            : 'scene_switch_4_button_long_press',
      ];
      const tokens = { button: String(button), pressType, gang: Number(button) || 1 };
      if (typeof this._tryCard === 'function') {
        for (const cardId of candidates) {
          // eslint-disable-next-line no-await-in-loop
          if (await this._tryCard(cardId, tokens, tokens)) {return;}
        }
      } else if (typeof this._safeTriggerFlow === 'function') {
        for (const cardId of candidates) {
          // eslint-disable-next-line no-await-in-loop
          if (await this._safeTriggerFlow(cardId, tokens, { type: 'e000-s4' })) {return;}
        }
      }
    } catch (e) {
      this.log(`[SCENE_SWITCH_4] Flow trigger error: ${e.message}`);
    }
  }

}

module.exports = SceneSwitch4Device;
