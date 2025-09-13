'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaTemperatureHumiditySensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // enable debugging
    this.enableDebug();

    // print the node's info to the console
    this.printNode();

    // Register temperature capability
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60, // 1 minute
            maxInterval: 300, // 5 minutes  
            minChange: 50, // 0.5°C
          },
        },
      });
    }

    // Register humidity capability
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60, // 1 minute
            maxInterval: 300, // 5 minutes
            minChange: 100, // 1%
          },
        },
      });
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300, // 5 minutes
            maxInterval: 3600, // 1 hour
            minChange: 5, // 5%
          },
        },
      });
    }

    this.log('Tuya Temperature & Humidity Sensor initialized');
  }

}

module.exports = TuyaTemperatureHumiditySensorDevice;
