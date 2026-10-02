'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote6GangDevice — 6-btn wall scene remote (TS0046 class)
 * P2609: hybrid RX fleet
 *
 * WHY(P2795 / #554 / ZHA#2034 / Z2M TS0046):
 * Loratap SS9600ZB-V2 / T066 (_TZ3000_iszegwpd + TS0046) interviews with ONLY
 * endpoints 1–4. Declaring EP5–6 in compose made Homey fail pairing with
 * "Connection impossible" after Zigbee join+interview succeeded. Compose now
 * lists EP1–4 only; buttons 5–6 stay as capabilities and are armed when the
 * Tuya magic handshake reveals late endpoints, or via mfr 0xFD/E000 payloads
 * that carry a button id. Never configureReporting onOff on this sleepy ED.
 */
class WallRemote6GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  /**
   * Count real Zigbee endpoints present on the node (ignore GP 242).
   * Soft — never throws.
   */
  _observedButtonEndpoints(zclNode) {
    try {
      const eps = zclNode?.endpoints || {};
      return Object.keys(eps)
        .map((k) => Number(k))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 8 && n !== 242)
        .sort((a, b) => a - b);
    } catch (_e) {
      return [];
    }
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    this.gangCount = 6;

    const observed = this._observedButtonEndpoints(zclNode);
    this._observedButtonEps = observed;
    // WHY(P2795/#554): 4-EP firmware is valid — do not demand EP5/6 at pair time
    this.log(`[WALL_REMOTE_6_GANG] observed EPs [${observed.join(',') || 'none'}] (compose declares 1–4; caps 1–6)`);

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    // WHY(P2795 / ZHA EnchantedDevice / Z2M configureMagicPacket): soft magic may
    // surface late EP5–6 after pair; never block init if magic/bind soft-fails.
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      await sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch((e) => {
        this.log('[WALL_REMOTE_6_GANG] magic soft-fail:', e && e.message);
      });
    } catch (e) {
      this.log('[WALL_REMOTE_6_GANG] magic import soft-fail:', e.message);
    }

    const afterMagic = this._observedButtonEndpoints(zclNode);
    if (afterMagic.length !== observed.length) {
      this.log(`[WALL_REMOTE_6_GANG] EPs after magic [${afterMagic.join(',')}]`);
      this._observedButtonEps = afterMagic;
    }

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 6,
        tag: 'WALL_REMOTE_6',
        // WHY(P2795): interview has no EF00 61184 — skip EF00 TX storm on sleepy remote
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[WALL_REMOTE_6_GANG] hybrid soft-fail:', e.message);
    }

    // WHY(P2795): never configureReporting(onOff) — sleepy EndDevice bind/report
    // storms are a known "Connection impossible" / first-press-dead cause.
    try {
      for (const epId of (this._observedButtonEps || observed)) {
        const ep = zclNode?.endpoints?.[epId];
        const onOff = ep?.clusters?.onOff || ep?.clusters?.[6];
        if (onOff && typeof onOff.configureReporting === 'function') {
          // leave reporting unconfigured; hybrid listens for 0xFD / commands
        }
      }
    } catch (_e) { /* soft */ }

    this.log('[WALL_REMOTE_6_GANG] hybrid ready (P2795 4-EP tolerant)');
  }

}

module.exports = WallRemote6GangDevice;
