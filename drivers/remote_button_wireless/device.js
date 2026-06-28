'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * RemoteButtonWirelessDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class RemoteButtonWirelessDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    
    await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[REMOTE_BUTTON_WIRELESS] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = RemoteButtonWirelessDevice;
