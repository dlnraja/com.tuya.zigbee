'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver initialized');
    this._usb_outlet_button_pressedTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_button_pressed');
  }
}

module.exports = UsbOutletAdvancedDriver;
