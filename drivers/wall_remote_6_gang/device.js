'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');

/**
 * WallRemote6GangDevice — 6-btn wall scene remote (TS0046 class)
 * P2609: hybrid RX fleet
 *
 * WHY(P2795 / #554 backport): compose declares EP1–4 only (interview firmware);
 * soft-fail missing EP5–6; skip EF00 TX on sleepy remote. Fingerprint+reliability only.
 */
class WallRemote6GangDevice extends ButtonDevice {

  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value} (button device, triggering press)`);
    await this.triggerButtonPress(gang || 1, 'single', 1, { source: 'virtual' });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;
    this.gangCount = 6;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    // WHY(P2795/#554): soft magic may surface late endpoints; never block pair
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      await sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch(() => {});
    } catch (_e) { /* soft — magic optional on stable */ }

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 6,
        tag: 'WALL_REMOTE_6',
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[WALL_REMOTE_6_GANG] hybrid soft-fail:', e.message);
    }

    this.log('[WALL_REMOTE_6_GANG] hybrid ready (P2795 4-EP tolerant)');
  }

}

module.exports = WallRemote6GangDevice;
