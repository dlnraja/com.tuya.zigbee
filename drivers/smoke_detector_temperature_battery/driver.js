'use strict';

const { Driver } = require('homey');

/**
 * Smoke Detector with Temperature (Battery) Driver
 */
class SmokeDetectorTemperatureBatteryDriver extends Driver {

  async onInit() {
    this.log('smoke_detector_temperature_battery driver initialized');
  }

  async onPair(session) {
    this.log('Pairing smoke_detector_temperature_battery...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = SmokeDetectorTemperatureBatteryDriver;
