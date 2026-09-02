'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button2GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    
    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log('[INIT] Error: ' + (err && err.message)); } catch (_e) { /* ignore */ }
      });

    // WHY(P2387): E000 raw gap-fill without orphaning PhysicalButtonMixin 0xFD chain
    try {
      const { installE000RawInterceptor } = require('../../lib/utils/ButtonE000RawInterceptor');
      installE000RawInterceptor(this, zclNode, {
        tag: 'button-wireless-2-raw',
        maxButton: 2,
        logPrefix: 'BUTTON2-RAW',
        pressContext: 'BTN2-RAW',
      });
    } catch (_e) { /* soft */ }
    
    this.log('[BUTTON_WIRELESS_2] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button2GangDevice;
