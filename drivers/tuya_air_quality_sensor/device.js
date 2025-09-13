'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaAirQualitySensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register CO2 capability
    if (this.hasCapability('measure_co2')) {
      this.registerCapability('measure_co2', 'msCO2', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 10,
          },
        },
      });
    }

    // Register PM2.5 capability
    if (this.hasCapability('measure_pm25')) {
      this.registerCapability('measure_pm25', 'msPM25', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 5,
          },
        },
      });
    }

    // Register temperature capability
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 50,
          },
        },
      });
    }

    // Register humidity capability
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 100,
          },
        },
      });
    }

    this.log('Tuya Air Quality Monitor initialized');
  }

}

module.exports = TuyaAirQualitySensorDevice;
