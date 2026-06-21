'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button6GangDevice - v10.0.0 Universal Standard
 * v5.11.219 FIX : extends ButtonDevice (pas PhysicalButtonMixin) pour avoir
 * _registerButtonCapabilityListeners → fix "Missing Capability Listener button.1-6".
 */
class Button6GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 6;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[BUTTON_WIRELESS_6] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button6GangDevice;
