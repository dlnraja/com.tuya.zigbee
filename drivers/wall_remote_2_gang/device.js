'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 2 Gang - TS0042
 * 2-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote2GangDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 2;
    this.log('[WALL_REMOTE_2_GANG] v5.12.0 init - 2 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_2_GANG] init err:', err.message));
    this.log('[WALL_REMOTE_2_GANG] ready');
  }
}

module.exports = WallRemote2GangDevice;
