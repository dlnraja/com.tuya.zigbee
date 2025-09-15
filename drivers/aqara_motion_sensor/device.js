'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AqaraMotionSensor extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    // Initialize device
    this.log('Aqara Motion Sensor initialized');
    
        // Register attribute reporting
    if (zclNode.endpoints[1]?.clusters?.msTemperatureMeasurement) {
      zclNode.endpoints[1].clusters.msTemperatureMeasurement.on('attr.measuredValue', (value) => {
        this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
      });
    }
  }
  
  
}

module.exports = AqaraMotionSensor;