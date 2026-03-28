'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Smart Remote 1 Button - TS004F
 * 1-button battery remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartRemote1ButtonDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.log('[SMART_REMOTE_1_BUTTON] v5.12.0 init - 1 button');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[SMART_REMOTE_1_BUTTON] init err:', err.message));
    this.log('[SMART_REMOTE_1_BUTTON] ready');
  }
}

module.exports = SmartRemote1ButtonDevice;
