'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartIrrigationControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_water', 'msFlowMeasurement');
    this.registerCapability('alarm_water', 'genAlarms');
    this.registerCapability('measure_battery', 'genPowerCfg');

    // Configure reporting
    this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: 'genOnOff',
        attributeName: 'onOff',
        minInterval: 1,
        maxInterval: 3600,
        minChange: 1
      }
    ]);

    this.log('SmartIrrigationControllerDevice has been initialized');
  }

}

module.exports = SmartIrrigationControllerDevice;
