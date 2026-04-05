'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Smart Remote 1 Button 2 - TS004F variant
 * 1-button battery remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartRemote1Button2Device extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;
    this.log('[SMART_REMOTE_1_BUTTON_2] v5.12.0 init - 1 button');
    await super.onNodeInit({ zclNode }).catch(err => this.error('[SMART_REMOTE_1_BUTTON_2] init err:', err.message));
    this.log('[SMART_REMOTE_1_BUTTON_2] ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartRemote1Button2Device;
