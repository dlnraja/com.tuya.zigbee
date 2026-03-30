'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 4 Gang - TS0044
 * 4-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote4GangDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.log('[WALL_REMOTE_4_GANG] v5.12.0 init - 4 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_4_GANG] init err:', err.message));
    this.log('[WALL_REMOTE_4_GANG] ready');
  }
}

module.exports = WallRemote4GangDevice;
