'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.551: Fixed - removed non-existent flow card reference
 */
class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver v5.5.551 initializing...');
    await super.onInit();

    // v5.5.551: Only register flow cards that exist in driver.flow.compose.json
    try {
      this._turnedOnTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_advanced_turned_on');
      this._turnedOffTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_advanced_turned_off');
      this._powerChangedTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_advanced_measure_power_changed');
      this.log('UsbOutletAdvancedDriver ✅ Flow cards registered');
    } catch (err) {
      this.error('UsbOutletAdvancedDriver flow card registration failed:', err.message);
    }
  }
}

module.exports = UsbOutletAdvancedDriver;
