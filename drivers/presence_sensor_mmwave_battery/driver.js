'use strict';

const { Driver } = require('homey');

/**
 * Presence Sensor Mmwave Battery Driver
 */
class PresenceSensorMmwaveBatteryDriver extends Driver {

  async onInit() {
    this.log('presence_sensor_mmwave_battery driver initialized');
  }

}

module.exports = PresenceSensorMmwaveBatteryDriver;
