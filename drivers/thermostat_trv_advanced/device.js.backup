'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointsComplete = require('../../lib/TuyaDataPointsComplete');

class ThermostatTrvAdvancedDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Smart TRV Advanced initializing...');
    
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
      "2": "target_temperature",
      "3": "measure_temperature",
      "4": "thermostat_mode",
      "7": "child_lock",
      "18": "window_detection",
      "20": "valve_state",
      "21": "measure_battery",
      "27": "calibration",
      "109": "valve_position",
      "130": "anti_scale"
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
    
    this.log('Smart TRV Advanced initialized');
  }
}

module.exports = ThermostatTrvAdvancedDevice;
