'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaEnergyPlugDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'genOnOff', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 300,
            minChange: 1,
          },
        },
      });
    }

    // Register power measurement
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'haElectricalMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 10,
            maxInterval: 60,
            minChange: 1,
          },
        },
      });
    }

    // Register current measurement
    if (this.hasCapability('measure_current')) {
      this.registerCapability('measure_current', 'haElectricalMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 10,
            maxInterval: 60,
            minChange: 10,
          },
        },
      });
    }

    // Register voltage measurement
    if (this.hasCapability('measure_voltage')) {
      this.registerCapability('measure_voltage', 'haElectricalMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 10,
            maxInterval: 60,
            minChange: 1,
          },
        },
      });
    }

    // Register energy meter
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'seMetering', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 1,
          },
        },
      });
    }

    this.log('Tuya Energy Plug initialized');
  }

}

module.exports = TuyaEnergyPlugDevice;
