'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

/**
 * Button4GangDevice — TS0044 / TS004F 4-button wireless (Nobø, Moes, Zemismart…)
 *
 * WHY(P2614): Homey charter = Button 1–4 in device view (maintenanceAction false).
 * Hybrid RX: genOnOff 0xFD + E000 + EF00 DP + raw (shared WallSceneRemoteHybridInit).
 * Extra: LevelControl step/move/stop for TS004F command/dimmer-style variants.
 * TX: never 0x8004 on TS0044; TS004F may get event mode via DeviceOperatingMode.
 * Sacred: _TZ3000_xffhmvhv+TS004F (Nobø), _TZ3000_u3nv1jwk+TS0044, abrsvsou/4fjiwweb.
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.gangCount = 4;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    // WHY(P2614): fleet hybrid — Homey does not natively decode Tuya 0xFD / E000 / EF00
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 4,
        tag: 'BUTTON_WIRELESS_4',
        onPress: async (btn, press) => {
          await this._triggerButton4Gang(btn, press);
        },
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_4] hybrid soft-fail:', e.message);
    }

    // TS004F / LevelControl variants (Z2M step/move/stop) — complementary to hybrid
    await this._setupLevelControlDetection(zclNode);

    this.log('[BUTTON_WIRELESS_4] P2614 hybrid + LevelControl ready; UI: Button N device view');
  }

  /**
   * LevelControl (0x0008) — TS004F arrow/dimmer-style actions on EP1–4.
   */
  async _setupLevelControlDetection(zclNode) {
    const eventMap = [
      { names: ['commandStep', 'commandStepWithOnOff', 'step', 'stepWithOnOff'], pressType: 'single' },
      { names: ['commandMove', 'commandMoveWithOnOff', 'move', 'moveWithOnOff'], pressType: 'long' },
      { names: ['commandStop', 'commandStopWithOnOff', 'stop', 'stopWithOnOff'], pressType: 'release' },
      { names: ['commandMoveToLevel', 'commandMoveToLevelWithOnOff', 'moveToLevel', 'moveToLevelWithOnOff'], pressType: 'single' },
    ];

    for (let ep = 1; ep <= 4; ep++) {
      const endpoint = zclNode?.endpoints?.[ep];
      const level = endpoint?.clusters?.levelControl
        || endpoint?.clusters?.genLevelCtrl
        || endpoint?.clusters?.[8]
        || endpoint?.clusters?.['8'];

      if (!level || typeof level.on !== 'function') {continue;}

      const trigger = async (pressType, payload = {}, source = 'level') => {
        const direction = payload?.stepMode === 0 || payload?.moveMode === 0
          ? 'up'
          : payload?.stepMode === 1 || payload?.moveMode === 1
            ? 'down'
            : 'unknown';
        const key = `level_${pressType}_${direction}`;
        if (this._isDeduped(ep, key)) {return;}
        this.log(`[LEVEL-4G] EP${ep} ${source} ${direction} -> Button ${ep} ${pressType}`);
        await this._triggerButton4Gang(ep, pressType);
      };

      for (const { names, pressType } of eventMap) {
        for (const eventName of names) {
          try {
            level.on(eventName, async (payload = {}) => trigger(pressType, payload, eventName));
          } catch (_e) {
            // Some SDK cluster shims reject unknown command listener names.
          }
        }
      }

      try {
        level.on('command', async (commandName, payload = {}) => {
          const name = String(commandName || '').toLowerCase();
          if (name.includes('stop')) {return trigger('release', payload, commandName);}
          if (name.includes('move')) {return trigger('long', payload, commandName);}
          if (name.includes('step')) {return trigger('single', payload, commandName);}
          return null;
        });
      } catch (_e) { /* optional */ }

      try {
        if (typeof level.bind === 'function') {await level.bind();}
      } catch (e) {
        this.log(`[LEVEL-4G] EP${ep} bind skipped: ${e.message}`);
      }

      this.log(`[LEVEL-4G] EP${ep} LevelControl detection ready`);
    }
  }

  async _triggerButton4Gang(button, pressType) {
    const btn = Math.max(1, Math.min(4, Number(button) || 1));
    const type = ['single', 'double', 'long', 'multi', 'release'].includes(pressType)
      ? pressType
      : resolvePressType(pressType, '4G');
    const count = type === 'multi' ? 3 : type === 'double' ? 2 : 1;

    if (this._isDeduped(btn, `flow_${type}`, 750)) {return;}

    if (typeof this.triggerButtonPress === 'function') {
      await this.triggerButtonPress(btn, type, count, { source: 'physical' });
      return;
    }

    // Fallback: declared compose IDs only (P2331)
    try {
      const driverId = this.driver?.id || 'button_wireless_4';
      const candidates = type === 'release'
        ? [
          `${driverId}_button_4gang_button_${btn}_release`,
          `${driverId}_button_${btn}_release`,
        ]
        : type === 'single'
          ? [
            `${driverId}_button_4gang_button_${btn}_pressed`,
            `${driverId}_button_4gang_button_pressed`,
          ]
          : type === 'double'
            ? [
              `${driverId}_button_4gang_button_${btn}_double`,
              `${driverId}_button_4gang_button_double_press`,
            ]
            : type === 'multi'
              ? [
                `${driverId}_button_4gang_button_${btn}_triple`,
                `${driverId}_button_4gang_button_multi_press`,
              ]
              : [
                `${driverId}_button_4gang_button_${btn}_long`,
                `${driverId}_button_4gang_button_long_press`,
              ];
      if (typeof this._safeTriggerFlow === 'function') {
        for (const cardId of candidates) {
          // eslint-disable-next-line no-await-in-loop
          if (await this._safeTriggerFlow(cardId, { button: String(btn), pressType: type, count, gang: btn }, { type })) {
            return;
          }
        }
      } else if (typeof this._tryCard === 'function') {
        for (const cardId of candidates) {
          // eslint-disable-next-line no-await-in-loop
          if (await this._tryCard(cardId, { button: String(btn), pressType: type, count }, { button: String(btn), count })) {
            return;
          }
        }
      }
    } catch (e) {
      this.log(`[BUTTON_WIRELESS_4] Flow trigger error: ${e.message}`);
    }
  }

  _isDeduped(ep, cmd, windowMs = 500) {
    const now = Date.now();
    const key = `${ep}_${cmd}`;
    if (now - (this._e000Dedup?.[key] || 0) < windowMs) {return true;}
    if (!this._e000Dedup) {this._e000Dedup = {};}
    this._e000Dedup[key] = now;
    return false;
  }

}

module.exports = Button4GangDevice;
