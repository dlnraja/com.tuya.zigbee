'use strict';

const { Driver } = require('homey');

/**
 * Motion Sensor with Illuminance (Battery) Driver
 */
class MotionSensorIlluminanceBatteryDriver extends Driver {

  async onInit() {
    this.log('motion_sensor_illuminance_battery driver initialized');
  }

  async onPair(session) {
    this.log('Pairing motion_sensor_illuminance_battery...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = MotionSensorIlluminanceBatteryDriver;
