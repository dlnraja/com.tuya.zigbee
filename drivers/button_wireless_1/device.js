'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const { installWallSceneRemoteHybrid } = require('../../lib/devices/WallSceneRemoteHybridInit');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * Button1GangDevice — TS0041 / SH-SC07 class (incl. Bastien `_TZ3000_axpdxqgu`).
 *
 * P2285: force buttonCount=1 (phantom EP2–4 on some siblings).
 * P2609: hybrid RX gap-fill.
 * P2630 Bastien live interview `_TZ3000_axpdxqgu`+TS0041:
 *   EP1 only: basic(0)+power(1)+onOff(6); out ota(25)+time(10)
 *   NO E000(57344) / NO EF00(61184) — never force EF00 TX; never write 0x8004
 *   ZCL batteryPercentageRemaining=200 → 100% (batteryVoltage=30 → 3.0V)
 *   RX: OnOff mfr 0xFD (single/double/hold) + raw + magic 0xFFDE
 *   Z2M: tuya.fz.on_off_action; ZHA: TuyaSmartRemote0041TO
 */
class Button1GangDevice extends ButtonDevice {

  /**
   * WHY(P2630): interview-shaped sticky — no EF00/E000, skip 0x8004, battery EP1.
   */
  getDeviceProfile() {
    const base = (typeof super.getDeviceProfile === 'function' && super.getDeviceProfile()) || {};
    return Object.assign({}, base, {
      batteryEpOnly: 1,
      writeSceneAttr: false,
      skip8004: true,
      usesE000: false,
      noEf00: true,
      protocol: 'zcl_0xfd',
      maxButtons: 1,
      buttonCount: 1,
      zcl200IsPercent: true,
      collapsePhantomEndpoints: true,
      mapAllEndpointsToButton1: true,
    });
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.gangCount = 1;

    try {
      const mfr = this.getSetting?.('zb_manufacturer_name')
        || zclNode?.manufacturerName
        || this.getData?.()?.manufacturerName
        || '';
      const pid = this.getSetting?.('zb_model_id')
        || zclNode?.modelId
        || this.getData?.()?.productId
        || '';
      if (containsCI(mfr, 'axpdxqgu') || (/TS0041/i.test(String(pid)) && !/TS004F/i.test(String(pid)))) {
        this._bastienTs0041Interview = {
          mfr: containsCI(mfr, 'axpdxqgu') ? '_TZ3000_axpdxqgu' : String(mfr),
          pid: 'TS0041',
          clustersEp1: [0, 1, 6],
          noEf00: true,
          noE000: true,
          ieeeHint: '7c:c6:b6:ff:fe:a3:e1:58',
        };
        this.log('[P2630] TS0041 sticky interview profile (0xFD only, battery EP1, no EF00/E000)');
      }
    } catch (_e) { /* soft */ }

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    try {
      const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
      if (profile?.collapsePhantomEndpoints || profile?.mapAllEndpointsToButton1) {
        this.buttonCount = Number(profile.buttonCount) || 1;
        this.gangCount = this.buttonCount;
      }
    } catch (_e) { /* soft */ }

    // WHY(P2316/P2630): Z2M configureMagicPacket — genBasic 0xFFDE=0x13 ASAP
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch(() => {});
    } catch (_e) { /* soft */ }

    try {
      await installWallSceneRemoteHybrid(this, zclNode, {
        maxButtons: 1,
        tag: 'BUTTON_WIRELESS_1',
        // Interview has no 0xEF00 / no E000 — listen soft-skips; never TX EF00
        skipEf00Tx: true,
      });
    } catch (e) {
      this.log('[BUTTON_WIRELESS_1] hybrid soft-fail:', e.message);
    }

    try {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '');
      if (/mrpevh8p|5bpeda8u|b4awzgct/i.test(mfr) && typeof this.setEnergy === 'function') {
        await this.setEnergy({ batteries: ['CR2450'] }).catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2470 energy lock CR2450 (SH-SC07)');
      }
    } catch (_e) { /* soft */ }

    try {
      if (!this.hasCapability('measure_battery') && typeof this.addCapability === 'function') {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2490 rehydrate measure_battery after strip');
      }
    } catch (_e) { /* soft */ }

    try {
      if (typeof this._ensureBatteryCapabilityUi === 'function') {
        await this._ensureBatteryCapabilityUi().catch(() => {});
      } else if (typeof this.setCapabilityOptions === 'function' && this.hasCapability('measure_battery')) {
        const cur = (typeof this.getCapabilityOptions === 'function' && this.getCapabilityOptions('measure_battery')) || {};
        if (cur.getable === false || cur.preventInsights === true) {
          await this.setCapabilityOptions('measure_battery', {
            ...cur,
            getable: true,
            preventInsights: false,
            units: cur.units || '%',
          }).catch(() => {});
          this.log('[BUTTON_WIRELESS_1] P2499/P2512 restored measure_battery getable/insights');
        }
      }
    } catch (_e) { /* soft */ }

    this.log('[BUTTON_WIRELESS_1] P2630 ready (TS0041 0xFD / battery EP1 / no EF00)');
  }

}

module.exports = Button1GangDevice;
