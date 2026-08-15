'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button8GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button8GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 8;
    
    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => {
        try { this.log('[INIT] Error: ' + (err && err.message)); } catch (_e) { /* ignore */ }
      });
    
    this.log('[BUTTON_WIRELESS_8] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button8GangDevice;
