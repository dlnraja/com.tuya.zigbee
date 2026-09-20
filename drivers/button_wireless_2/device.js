'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * Button2GangDevice — TS0042 / 2-btn wall scene remote (battery or USB)
 * P2609: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 + raw)
 * P2636: _TZ3000_dzwgk7e2 + TS0042 — interview may show 4 EPs (TS0044 phantom FW);
 *        keep buttonCount=2; hybrid ignores EP3/4 (never map to btn1).
 */
class Button2GangDevice extends ButtonDevice {

  _isDzwgk7e2Phantom4Ep() {
    try {
      const mfr = String(
        this.getSetting?.('zb_manufacturer_name')
        || this.getData?.()?.manufacturerName
        || '',
      );
      const pid = String(
        this.getSetting?.('zb_model_id')
        || this.getData?.()?.productId
        || this.getData?.()?.modelId
        || '',
      );
      return containsCI(mfr, 'dzwgk7e2') && /^TS0042$/i.test(pid);
    } catch (_e) {
      return false;
    }
  }

  async _stripPhantomButtonCapsBeyond2() {
    for (const cap of ['button.3', 'button.4', 'button.5', 'button.6']) {
      try {
        if (this.hasCapability?.(cap)) {
          await this.removeCapability(cap).catch(() => {});
        }
      } catch (_e) { /* soft */ }
    }
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.gangCount = 2;

    if (this._isDzwgk7e2Phantom4Ep()) {
      this._p2636Dzwgk7e2 = true;
      this.log('[P2636] dzwgk7e2+TS0042 — 2-btn sticky; ignore phantom EP3/4');
    }

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    // WHY(P2609): E000-only was incomplete — AliExpress 2-btn stickies use 0xFD + EF00 too
    // WHY(P2636): interview has no EF00 (61184) — skip EF00 TX storm on sleepy battery
    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 2,
        tag: 'BUTTON_WIRELESS_2',
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_2] hybrid soft-fail:', e.message);
    }

    await this._stripPhantomButtonCapsBeyond2();
    this.log('[BUTTON_WIRELESS_2] hybrid wall remote ready (TS0042 class)');
  }

}

module.exports = Button2GangDevice;
