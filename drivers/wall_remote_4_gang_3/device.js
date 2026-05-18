'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * WallRemote4Gang3Device - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class WallRemote4Gang3Device extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    this.log('[WALL_REMOTE_4_GANG_3] 🔘 v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = WallRemote4Gang3Device;
