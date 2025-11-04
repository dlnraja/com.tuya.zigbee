'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointsComplete = require('../../lib/TuyaDataPointsComplete');

class SensorAirQualityFullDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Air Quality Monitor Full initializing...');
    
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
      "18": "measure_co2",
      "19": "measure_voc",
      "20": "measure_pm25",
      "21": "measure_pm10",
      "22": "measure_hcho",
      "102": "measure_temperature",
      "106": "measure_humidity"
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
    
    this.log('Air Quality Monitor Full initialized');
  }
}

module.exports = SensorAirQualityFullDevice;
