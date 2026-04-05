'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Smart Button Switch - TS0041
 * 1-button battery switch using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartButtonSwitchDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.log('[SMART_BUTTON_SWITCH] v5.12.0 init - 1 button');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[SMART_BUTTON_SWITCH] init err:', err.message));
    this.log('[SMART_BUTTON_SWITCH] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartButtonSwitchDevice;
