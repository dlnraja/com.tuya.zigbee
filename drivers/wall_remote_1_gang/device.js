'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 1 Gang - TS0041
 * 1-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote1GangDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.log('[WALL_REMOTE_1_GANG] v5.12.0 init - 1 button');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_1_GANG] init err:', err.message));
    this.log('[WALL_REMOTE_1_GANG] ready');
  }
}

module.exports = WallRemote1GangDevice;
