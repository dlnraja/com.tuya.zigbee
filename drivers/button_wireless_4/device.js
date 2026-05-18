'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button4GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[BUTTON_WIRELESS_4] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = Button4GangDevice;
