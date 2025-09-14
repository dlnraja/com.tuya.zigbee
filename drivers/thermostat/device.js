'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaThermostatDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register target temperature capability
    if (this.hasCapability('target_temperature')) {
      this.registerCapability('target_temperature', 'hvacThermostat', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 50,
          },
        },
      });
    }

    // Register current temperature capability
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

    // Register thermostat mode capability
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapability('thermostat_mode', 'hvacThermostat', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    this.log('Tuya Smart Thermostat initialized');
  }

}

module.exports = TuyaThermostatDevice;
