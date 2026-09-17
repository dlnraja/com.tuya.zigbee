'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice — TS0041 / SH-SC07 class (incl. _TZ3000_mrpevh8p).
 * WHY(P2285): force buttonCount=1 before Physical mixin (interview has phantom EP2–4).
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.gangCount = 1;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });

    // Re-assert after profile/mixin (SH-SC07 siblings)
    try {
      const profile = typeof this.getDeviceProfile === 'function' ? this.getDeviceProfile() : null;
      if (profile?.collapsePhantomEndpoints || profile?.mapAllEndpointsToButton1) {
        this.buttonCount = Number(profile.buttonCount) || 1;
        this.gangCount = this.buttonCount;
      }
    } catch (_e) { /* soft */ }

    // WHY(P2316): Z2M/HA “first action ignored” — genBasic 0xFFDE=0x13 ASAP after pair
    // (same as Z2M configure write). Fire-and-forget; wake path also force-resends.
    try {
      const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
      sendTuyaMagicPacket(this, zclNode, 1, { force: true }).catch(() => {});
    } catch (_e) { /* soft */ }

    // WHY(P2470 / Peter 8afffc76): Homey showed CR2032 because compose listed it first;
    // SH-SC07 is CR2450 (Z2M). Lock energy so Insights/battery UI stay correct after re-pair.
    try {
      const mfr = String(this.getSetting?.('zb_manufacturer_name') || this.getData?.()?.manufacturerName || '');
      if (/mrpevh8p|5bpeda8u|b4awzgct/i.test(mfr) && typeof this.setEnergy === 'function') {
        await this.setEnergy({ batteries: ['CR2450'] }).catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2470 energy lock CR2450 (SH-SC07)');
      }
    } catch (_e) { /* soft */ }

    // WHY(P2490 / Peter #2237 complementary to P2488): if an older tip already stripped
    // measure_battery, keep-lock alone cannot paint % until the cap exists again.
    // Rehydrate on boot — then wake ZCL / store paint can fill Insights.
    try {
      if (!this.hasCapability('measure_battery') && typeof this.addCapability === 'function') {
        await this.addCapability('measure_battery').catch(() => {});
        this.log('[BUTTON_WIRELESS_1] P2490 rehydrate measure_battery after strip');
      }
    } catch (_e) { /* soft */ }

    // WHY(P2499 / Peter #2238 @ 9.0.926 diag 77394256): compose once had
    // capabilitiesOptions.measure_battery.getable=false → Homey hid Battery + History
    // even when ZCL painted %. Soft-heal runtime options if SDK exposes setter.
    // WHY(P2512 / Peter #2233–#2234 diags 8afffc76 / 1e071a86): also force
    // preventInsights:false every boot — app.json drift had getable:false and
    // heal only ran on battery ingest (sleepy never wakes → History stays gone).
    // WHY(P2550 / Peter #2239 b8b78521): % OK but History empty → recycle Insights log.
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

    this.log('[BUTTON_WIRELESS_1] v10.0.0+P2316 init (1-btn lock + magic 0xFFDE)');
  }

}

module.exports = Button1GangDevice;
