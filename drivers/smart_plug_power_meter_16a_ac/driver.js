'use strict';

const { Driver } = require('homey');

/**
 * Smart Plug Power Meter 16a Ac Driver
 */
class SmartPlugPowerMeter16aAcDriver extends Driver {

  async onInit() {
    this.log('smart_plug_power_meter_16a_ac driver initialized');
  }

}

module.exports = SmartPlugPowerMeter16aAcDriver;
