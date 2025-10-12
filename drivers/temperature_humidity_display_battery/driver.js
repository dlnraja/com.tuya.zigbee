'use strict';

const { Driver } = require('homey');

/**
 * Temperature Humidity Display (Battery) Driver
 */
class TemperatureHumidityDisplayBatteryDriver extends Driver {

  async onInit() {
    this.log('temperature_humidity_display_battery driver initialized');
  }

  async onPair(session) {
    this.log('Pairing temperature_humidity_display_battery...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = TemperatureHumidityDisplayBatteryDriver;
