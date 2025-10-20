'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * PresenceSensorFp1BatteryDevice
 * 
 * SUPPORTED BRANDS:
 * - Aqara
 * 
 * COMPATIBLE PRODUCTS:
 * - Aqara Presence Sensor FP1 (lumi.motion.ac01, lumi.motion.agl04)
 * - Advanced mmWave presence detection
 * 
 * Note: Driver ID and folder name are UNBRANDED for universal compatibility.
 * Brand identification happens via manufacturerName and productId fields.
 */

class PresenceSensorFp1BatteryDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Aqara FP1 - mmWave presence detection
    
    this.log('Presence Sensor FP1 (Advanced) initialized');
  }
}

module.exports = PresenceSensorFp1BatteryDevice;
