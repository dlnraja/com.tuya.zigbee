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
 *   RX: OnOff mfr 0xFD (0/1/2 = single/double/hold) + raw + magic 0xFFDE
 *   Z2M: tuya.fz.on_off_action + configureMagicPacket; ZHA: TuyaSmartRemote0041TO
 * P2638 cross-ref: Z2M#25720 (HA legacy_action_sensor — Homey uses Flow triggers, not sticky action),
 *   ZHA gist compujunk remote_button_*_press, SmartHomeScene Moes Star Ring CR2032,
 *   XiaomiGateway3 APS 0xFD00 → button_single. UI "3ch" ≠ productId — still 1 btn.
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
      skipBatteryReporting: true,
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
      // WHY(P2633/P2639 / HA T455202): Chinese TS0041 often ships TS0044 4-EP firmware —
      // collapse phantom EP2–4; RX OnOff 0xFD; never treat as 4-gang / never 0x8004.
      // Siblings: adndolvx, itb0omhv (T455202), x7mej5oc (ZHA#1557). axpdxqgu = clean 1-EP interview.
      const phantomClass = containsCI(mfr, 'adndolvx') || containsCI(mfr, 'itb0omhv')
        || containsCI(mfr, 'x7mej5oc');
      if (containsCI(mfr, 'axpdxqgu') || phantomClass
        || (/TS0041/i.test(String(pid)) && !/TS004F/i.test(String(pid)))) {
        const lockedMfr = containsCI(mfr, 'axpdxqgu') ? '_TZ3000_axpdxqgu'
          : (containsCI(mfr, 'adndolvx') ? '_TZ3000_adndolvx'
            : (containsCI(mfr, 'itb0omhv') ? '_TZ3000_itb0omhv'
              : (containsCI(mfr, 'x7mej5oc') ? '_TZ3000_x7mej5oc' : String(mfr))));
        this._bastienTs0041Interview = {
          mfr: lockedMfr,
          pid: 'TS0041',
          clustersEp1: phantomClass ? [0, 1, 6, 57344] : [0, 1, 6],
          noEf00: true,
          noE000: !phantomClass,
          phantomEpFirmware: true,
          ieeeHint: containsCI(mfr, 'axpdxqgu') ? '7c:c6:b6:ff:fe:a3:e1:58' : undefined,
        };
        this.log(`[P2630/P2633/P2639] TS0041 sticky (${lockedMfr}; 0xFD; collapse phantom EPs; no EF00)`);
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

    // WHY(P2316/P2630/P2685): magic once — cooldown inside TuyaMagicPacket (no force storm)
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
      } else if (/axpdxqgu|filhl5b7/i.test(mfr) && typeof this.setEnergy === 'function') {
        // WHY(P2638): Moes Star Ring / ZT-YK01 class — CR2032 (SmartHomeScene); not CR2450 SH-SC07
        await this.setEnergy({ batteries: ['CR2032'] }).catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2638 energy lock CR2032 (Moes Star Ring / axpdxqgu)');
      }
    } catch (_e) { /* soft */ }

    try {
      // WHY(P2684): Unknown/wrong-driver re-pair sometimes leaves no button.1 → Homey Flow
      // hides « Bouton 1 appuyé » (device filter driver_id=button_wireless_1 only).
      if (!this.hasCapability('button.1') && typeof this.addCapability === 'function') {
        await this.addCapability('button.1').catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2684 rehydrate button.1 for Flow UX');
      }
      if (!this.hasCapability('measure_battery') && typeof this.addCapability === 'function') {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2490 rehydrate measure_battery after strip');
      }
      // WHY(P2684 / Homey guidelines): never keep alarm_battery alongside measure_battery
      if (this.hasCapability('alarm_battery') && typeof this.removeCapability === 'function') {
        await this.removeCapability('alarm_battery').catch(() => {});
      }
    } catch (_e) { /* soft */ }

    try {
      const { applyHomeyButtonUiCharter } = require('../../lib/utils/HomeyButtonUiCharter');
      await applyHomeyButtonUiCharter(this);
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

    this.log('[BUTTON_WIRELESS_1] P2630/P2684 ready (TS0041 0xFD / Flow Bouton 1)');
  }

}

module.exports = Button1GangDevice;
