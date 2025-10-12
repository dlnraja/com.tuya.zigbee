'use strict';

const { Driver } = require('homey');

/**
 * Contact Sensor Battery Driver
 */
class ContactSensorBatteryDriver extends Driver {

  async onInit() {
    this.log('contact_sensor_battery driver initialized');
  }

}

module.exports = ContactSensorBatteryDriver;
