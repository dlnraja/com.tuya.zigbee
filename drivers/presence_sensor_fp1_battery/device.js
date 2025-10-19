'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class PresenceSensorFp1BatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Aqara FP1 - mmWave presence detection
    
    this.log('Presence Sensor FP1 (Advanced) initialized');
  }
}

module.exports = PresenceSensorFp1BatteryDevice;
