'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbDongleTripleDriver extends ZigBeeDriver {
  async onInit() {
    this.log('USB Dongle Triple Driver initialized');
    this.homey.flow.getDeviceTriggerCard('usb_dongle_triple_turned_on');
    this.homey.flow.getDeviceTriggerCard('usb_dongle_triple_turned_off');
    this.homey.flow.getDeviceTriggerCard('usb_dongle_triple_power_changed');
    this.homey.flow.getDeviceConditionCard('usb_dongle_triple_is_on').registerRunListener(async (args) => {
      return args.device.getCapabilityValue('onoff') === true;
    });
    this.homey.flow.getDeviceConditionCard('usb_dongle_triple_power_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_power') || 0) > args.power;
    });
    this.homey.flow.getDeviceActionCard('usb_dongle_triple_all_on').registerRunListener(async (args) => {
      const d = args.device;
      for (const cap of ['onoff', 'onoff.usb2', 'onoff.usb3']) {
        if (d.hasCapability(cap)) await d.triggerCapabilityListener(cap, true);
      }
    });
    this.homey.flow.getDeviceActionCard('usb_dongle_triple_all_off').registerRunListener(async (args) => {
      const d = args.device;
      for (const cap of ['onoff', 'onoff.usb2', 'onoff.usb3']) {
        if (d.hasCapability(cap)) await d.triggerCapabilityListener(cap, false);
      }
    });
  }
}

module.exports = UsbDongleTripleDriver;
