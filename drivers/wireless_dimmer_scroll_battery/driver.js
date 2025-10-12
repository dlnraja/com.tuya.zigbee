'use strict';

const { Driver } = require('homey');

/**
 * Wireless Dimmer Scroll Battery Driver
 */
class WirelessDimmerScrollBatteryDriver extends Driver {

  async onInit() {
    this.log('wireless_dimmer_scroll_battery driver initialized');
  }

}

module.exports = WirelessDimmerScrollBatteryDriver;
