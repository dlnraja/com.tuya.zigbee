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

    this.log('[BUTTON_WIRELESS_1] 🔘 v10.0.0 initialized via ButtonDevice (P2285 1-btn lock)');
  }

}

module.exports = Button1GangDevice;
