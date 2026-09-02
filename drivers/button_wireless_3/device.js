'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button3GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button3GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    
    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log('[INIT] Error: ' + (err && err.message)); } catch (_e) { /* ignore */ }
      });

    // WHY(P2387): TS0043 E000 raw gap-fill — append-only wrapHandleFrame
    try {
      const { installE000RawInterceptor } = require('../../lib/utils/ButtonE000RawInterceptor');
      installE000RawInterceptor(this, zclNode, {
        tag: 'button-wireless-3-raw',
        maxButton: 3,
        logPrefix: 'BUTTON3-RAW',
        pressContext: 'BTN3-RAW',
      });
    } catch (_e) { /* soft */ }
    
    this.log('[BUTTON_WIRELESS_3] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button3GangDevice;
