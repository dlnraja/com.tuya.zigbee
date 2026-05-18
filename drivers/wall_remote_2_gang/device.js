'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * WallRemote2GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class WallRemote2GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[WALL_REMOTE_2_GANG] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = WallRemote2GangDevice;
