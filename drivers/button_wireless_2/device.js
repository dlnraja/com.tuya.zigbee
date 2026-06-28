'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button2GangDevice - v10.0.0 Universal Standard
 * v5.11.218 FIX CRITICAL (même bug que button_wireless_3) :
 * super.on() → super.onNodeInit({ zclNode }), extends ButtonDevice.
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_2] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button2GangDevice;
