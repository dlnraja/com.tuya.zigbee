'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice - v10.0.0 Universal Standard
 * v5.11.219 FIX : extends ButtonDevice (pas PhysicalButtonMixin) pour avoir
 * _registerButtonCapabilityListeners → fix "Missing Capability Listener button.1".
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;

    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_1] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button1GangDevice;
