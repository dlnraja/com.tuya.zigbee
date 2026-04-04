'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Handheld Remote 4 Buttons - TS0044
 * 4-button handheld battery remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class HandheldRemote4ButtonsDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    this.log('[HANDHELD_REMOTE_4_BUTTONS] v5.12.0 init - 4 buttons');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[HANDHELD_REMOTE_4_BUTTONS] init err:', err.message));
    this.log('[HANDHELD_REMOTE_4_BUTTONS] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = HandheldRemote4ButtonsDevice;
