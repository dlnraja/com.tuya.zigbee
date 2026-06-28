'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');

/**
 * Smart Knob Switch - TS004F
 * 1-button battery knob switch using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartKnobSwitchDevice extends PhysicalButtonMixin(VirtualButtonMixin(ButtonDevice)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 1;
      this.log('[SMART_KNOB_SWITCH] v5.12.0 init - 1 button');
      await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[SMART_KNOB_SWITCH] init err:', err.message));
      this.log('[SMART_KNOB_SWITCH] ready');
     }, 'onNodeInit');
  }


  onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartKnobSwitchDevice;
