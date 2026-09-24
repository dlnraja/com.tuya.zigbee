'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { installTs004xDedicatedComplement } = require('../../lib/devices/Ts004xDedicatedComplement');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * Button3GangDevice — battery wall scene remote (TS0043 / Zemismart / Moes / Lonsonho)
 *
 * P2608: full hybrid RX (ZCL + OnOff 0xFD + E000 + EF00 DP + raw).
 * P2629 Bastien live interview `_TZ3000_vsxvaj9i`+TS0043:
 *   EP1: basic(0)+power(1)+onOff(6)+E000(57344); out ota(25)+time(10)
 *   EP2–4: onOff+power (phantom battery 0 junk — use EP1 only)
 *   NO cluster EF00/61184 — never force EF00 TX; never write 0x8004
 *   ZCL batteryPercentageRemaining=200 → 100%
 */
class Button3GangDevice extends ButtonDevice {

  /**
   * WHY(P2629): profile drives batteryEpOnly + skip 0x8004 for all TS0043 stickies.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    return Object.assign({}, base, {
      brand: base.brand || 'Tuya',
      batteryEpOnly: 1,
      writeSceneAttr: false,
      skip8004: true,
      usesE000: true,
      noEf00: true,
      noEf00Tx: true,
      protocol: 'zcl_0xfd_e000',
      productId: base.productId || 'TS0043',
      buttonCount: 3,
      maxButtons: 3,
      // WHY(P2706): ultra-snappy + skipUiPulse — Contre quoi crash noir + lag TS0041
      debounceMs: Math.min(Number(base.debounceMs) || 40, 40),
      crossPathDedupMs: Math.min(Number(base.crossPathDedupMs) || 60, 60),
      appCommandWindow: Math.min(Number(base.appCommandWindow) || 200, 200),
      doubleClickWindow: Math.min(Number(base.doubleClickWindow) || 140, 140),
      collapsePhantomEndpoints: true,
      sceneSwitch: true,
      zcl200IsPercent: true,
      skipBatteryReporting: true,
      skipSoftwareHoldRelease: true,
      disableLevelControlComplement: true,
      snappyRelayFlow: true,
      skipUiPulse: true,
      source: base.source || 'P2706_button_wireless_3',
    });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.gangCount = 3;

    // Lock live couple for diags / charter
    try {
      const mfr = this.getSetting?.('zb_manufacturer_name')
        || zclNode?.manufacturerName
        || this.getData?.()?.manufacturerName
        || '';
      const pid = this.getSetting?.('zb_model_id')
        || zclNode?.modelId
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'vsxvaj9i') || /TS0043/i.test(String(pid))) {
        this._bastienTs0043Interview = {
          mfr: '_TZ3000_vsxvaj9i',
          pid: 'TS0043',
          clustersEp1: [0, 1, 6, 57344],
          noEf00: true,
          // WHY(P2703): live mesh Node 7 = 5b:91:98… (Homey Appareil Zigbee); prior f6:3d OFF_MESH
          ieeeHint: 'a4:c1:38:5b:91:98:dd:55',
          ieeeHintPrior: 'a4:c1:38:f6:3d:2d:c9:79',
        };
        this.log('[P2629/P2703] TS0043 sticky interview profile (0xFD/E000, battery EP1, no EF00)');
      }
    } catch (_e) { /* soft */ }

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
        // Interview has no 0xEF00 — listen soft-skips; never TX EF00
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] hybrid soft-fail:', e.message);
    }

    // WHY(P2616 complementary): dedicated LevelControl + parseZclHeader — never wipe hybrid
    try {
      await installTs004xDedicatedComplement(this, zclNode, {
        maxButtons: 3,
        tag: 'BUTTON_WIRELESS_3',
        // WHY(P2693): LevelControl stop→release invent = ghost "other" lamp
        enableLevelControl: false,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_3] dedicated complement soft-fail:', e.message);
    }

    // WHY(P2699/P2701): E000 + 0xFD are Homey-gap — complementary soft-arm only (never EF00 mandatory)
    try {
      const { softArmComplementaryIo } = require('../../lib/io/NonNativeComplementary');
      softArmComplementaryIo(this, { zclNode, io: this.io });
    } catch (_e) { /* optional */ }

    this.log('[BUTTON_WIRELESS_3] hybrid UNION dedicated (TS0043 class / P2693)');
  }

}

module.exports = Button3GangDevice;
