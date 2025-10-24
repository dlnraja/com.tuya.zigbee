'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutlet3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutlet3GangDriver initialized');
    
    // Register flow cards
    this.registerFlowCards();
  }

  /**
   * Register flow cards for USB outlet control
   */
  registerFlowCards() {
    // Port 1 turned on
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port1_turned_on')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port 1 turned off
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port1_turned_off')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port 2 turned on
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port2_turned_on')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port 2 turned off
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port2_turned_off')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port 3 turned on
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port3_turned_on')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Port 3 turned off
    this.homey.flow.getDeviceTriggerCard('usb_outlet_3gang_port3_turned_off')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }
}

module.exports = UsbOutlet3GangDriver;
