'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaRadarSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.enableDebug();
    this.printNode();

    // Register motion capability
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'msOccupancySensing', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 1,
            maxInterval: 30,
            minChange: 1,
          },
        },
      });
    }

    // Register luminance capability
    if (this.hasCapability('measure_luminance')) {
      this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 60,
            maxInterval: 300,
            minChange: 10,
          },
        },
      });
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 'genPowerCfg', {
        reportOpts: {
          configureAttributeReporting: {
            minInterval: 300,
            maxInterval: 3600,
            minChange: 5,
          },
        },
      });
    }

    this.log('Tuya Radar Motion Sensor initialized');
  }

}

module.exports = TuyaRadarSensorDevice;
