'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * SmartRemote4ButtonsDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class SmartRemote4ButtonsDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    
    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[SMART_REMOTE_4_BUTTONS] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = SmartRemote4ButtonsDevice;
