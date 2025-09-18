'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmokeDetectorTempHumidityAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register capabilities
    this.registerCapability('alarm_smoke', 'iasZone');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    this.registerCapability('measure_humidity', 'msRelativeHumidity');
    this.registerCapability('measure_battery', 'genPowerCfg');
    this.registerCapability('alarm_battery', 'genPowerCfg');

    // Temperature reporting
    this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: 'msTemperatureMeasurement',
        attributeName: 'measuredValue',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 100
      }
    ]);

    // Humidity reporting  
    this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: 'msRelativeHumidity', 
        attributeName: 'measuredValue',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 500
      }
    ]);

    // Battery reporting
    this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: 'genPowerCfg',
        attributeName: 'batteryPercentageRemaining',
        minInterval: 300,
        maxInterval: 3600,
        minChange: 1
      }
    ]);

    this.log('SmokeDetectorTempHumidityAdvancedDevice has been initialized');
  }

}

module.exports = SmokeDetectorTempHumidityAdvancedDevice;
