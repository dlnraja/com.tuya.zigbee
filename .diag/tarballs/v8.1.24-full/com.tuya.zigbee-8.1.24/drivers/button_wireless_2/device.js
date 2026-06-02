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
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[BUTTON_WIRELESS_2] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button2GangDevice;
