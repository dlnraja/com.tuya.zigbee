'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * PresenceSensorFp2AcDevice
 * 
 * SUPPORTED BRANDS:
 * - Aqara
 * 
 * COMPATIBLE PRODUCTS:
 * - Aqara Presence Sensor FP2 (lumi.motion.ac02)
 * - Multi-zone mmWave presence detection
 * 
 * Note: Driver ID and folder name are UNBRANDED for universal compatibility.
 * Brand identification happens via manufacturerName and productId fields.
 */

class PresenceSensorFp2AcDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // Aqara FP2 - Multi-zone presence detection
    
    this.log('Presence Sensor FP2 (Zones) initialized');
  }
}

module.exports = PresenceSensorFp2AcDevice;
