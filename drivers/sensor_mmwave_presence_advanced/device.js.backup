'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointsComplete = require('../../lib/TuyaDataPointsComplete');

class SensorMmwavePresenceAdvancedDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('mmWave Presence Sensor Advanced initializing...');
    
    // Get Tuya EF00 cluster
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      throw new Error('Endpoint 1 not found');
    }
    
    const tuyaCluster = endpoint.clusters.tuyaManufacturer || endpoint.clusters.tuyaSpecific;
    if (!tuyaCluster) {
      this.error('No Tuya cluster found');
      return;
    }
    
    // Setup DataPoint listeners
    const dpMappings = {
      "1": "alarm_motion",
      "9": "presence_sensitivity",
      "10": "measure_distance",
      "104": "measure_luminance",
      "105": "presence_timeout"
};
    
    // Listen for DP reports
    tuyaCluster.on('reporting', frame => {
      this.log('Tuya reporting:', frame);
      
      try {
        const dp = frame.dp || frame.datapoint;
        const value = frame.data || frame.value;
        
        const capability = dpMappings['0x' + dp.toString(16).toUpperCase().padStart(2, '0')];
        if (capability && this.hasCapability(capability)) {
          // Parse and set value
          this.setCapabilityValue(capability, value).catch(this.error);
        }
      } catch (err) {
        this.error('DP parsing error:', err);
      }
    });
    
    this.log('mmWave Presence Sensor Advanced initialized');
  }
}

module.exports = SensorMmwavePresenceAdvancedDevice;
