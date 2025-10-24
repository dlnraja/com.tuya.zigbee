'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutlet1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutlet1GangDriver initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  /**
   * Register flow cards for USB outlet control
   */
  registerFlowCards() {
    // Port turned on
    this.homey.flow.getDeviceTriggerCard('usb_outlet_1gang_turned_on')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port turned off
    this.homey.flow.getDeviceTriggerCard('usb_outlet_1gang_turned_off')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }
}

module.exports = UsbOutlet1GangDriver;
