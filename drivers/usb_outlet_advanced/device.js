'use strict';
const { HybridPlugBase } = require('../../lib/devices');

class USBOutletAdvancedDevice extends HybridPlugBase {
  get plugCapabilities() { return ['onoff', 'onoff.usb1', 'onoff.usb2']; }
  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true },
      10: { capability: 'onoff.usb2', transform: (v) => v === 1 || v === true }
    };
  }
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('[USB-ADV] ✅ Ready');
  }
}
module.exports = USBOutletAdvancedDevice;
