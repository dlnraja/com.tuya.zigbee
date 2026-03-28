'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 3 Gang - TS0043
 * 3-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote3GangDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 3;
    this.log('[WALL_REMOTE_3_GANG] v5.12.0 init - 3 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_3_GANG] init err:', err.message));
    this.log('[WALL_REMOTE_3_GANG] ready');
  }
}

module.exports = WallRemote3GangDevice;
