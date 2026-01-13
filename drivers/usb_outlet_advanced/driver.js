'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.506: Fixed flow card registration with error handling
 */
class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver v5.5.506 initializing...');
    await super.onInit();

    try {
      this._usb_outlet_button_pressedTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_button_pressed');
      this.log('UsbOutletAdvancedDriver ✅ Flow cards registered');
    } catch (err) {
      this.error('UsbOutletAdvancedDriver flow card registration failed:', err.message);
    }
  }
}

module.exports = UsbOutletAdvancedDriver;
