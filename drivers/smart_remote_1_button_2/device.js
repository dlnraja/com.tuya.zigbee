'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SmartRemote1Button2Device - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class SmartRemote1Button2Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[SMART_REMOTE_1_BUTTON_2] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SmartRemote1Button2Device;
