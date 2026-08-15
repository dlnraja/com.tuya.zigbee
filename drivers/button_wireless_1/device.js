'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button1GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button1GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    
    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        // Never this.error — Gmail: Cannot assign to read only property 'error'
        try { this.log(`[INIT] Error: ${err && err.message}`); } catch (_e) { /* ignore */ }
      });
    
    this.log('[BUTTON_WIRELESS_1] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button1GangDevice;
