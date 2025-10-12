'use strict';

const { Driver } = require('homey');

/**
 * Wireless Button 2gang Battery Driver
 */
class WirelessButton2gangBatteryDriver extends Driver {

  async onInit() {
    this.log('wireless_button_2gang_battery driver initialized');
  }

}

module.exports = WirelessButton2gangBatteryDriver;
