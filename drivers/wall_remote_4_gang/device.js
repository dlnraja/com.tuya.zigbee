'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * v5.11.219 FIX : extends ButtonDevice pour _registerButtonCapabilityListeners.
 * Fix "Missing Capability Listener button.X" sur stable-v5.
 */
class WallRemote4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;

    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));

    this.log('[wall_remote_4_gang] v10.0.0 initialized via ButtonDevice');
  }

}

module.exports = WallRemote4GangDevice;
