'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Wall Remote 4 Gang 2 - TS0044 variant
 * 4-button battery wall remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class WallRemote4Gang2Device extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.log('[WALL_REMOTE_4_GANG_2] v5.12.0 init - 4 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[WALL_REMOTE_4_GANG_2] init err:', err.message));
    this.log('[WALL_REMOTE_4_GANG_2] ready');
  }
}

module.exports = WallRemote4Gang2Device;
