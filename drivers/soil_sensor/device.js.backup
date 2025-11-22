'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDataPointEngine = require('../../lib/TuyaDataPointEngine');

/**
 * Soil Tester Temp Humid
 * 
 * Manufacturer: _TZE284_oitavov2
 * Product ID: TS0601
 * Type: TS0601 (Pure Tuya DP device)
 * 
 * Protocol: Uses Tuya DataPoints (DP) over cluster 0xEF00
 * This device does NOT use standard Zigbee clusters for sensors.
 * All data is transmitted via Tuya proprietary DP protocol.
 */
class SoilSensorDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.log('Soil Tester Temp Humid initializing...');
    this.log('Manufacturer:', '_TZE284_oitavov2');
    this.log('Product:', 'TS0601');
    
    // Get Tuya cluster (0xEF00 = 61184)
    const endpoint = zclNode.endpoints[1];
    if (!endpoint) {
      throw new Error('Endpoint 1 not found');
    }
    
    const tuyaCluster = endpoint.clusters.tuyaManufacturer 
                     || endpoint.clusters.tuyaSpecific
                     || endpoint.clusters.manuSpecificTuya
                     || endpoint.clusters[0xEF00]
                     || endpoint.clusters[61184];
    
    if (!tuyaCluster) {
      throw new Error('Tuya cluster not found - this is a TS0601 device and requires cluster 0xEF00');
    }
    
    this.log('✅ Tuya cluster found');
    
    // Initialize Tuya DataPoint Engine
    this.dpEngine = new TuyaDataPointEngine(this, tuyaCluster);
    
    // DP Mapping for this device
    const dpMapping = {
    measure_temperature: {
        dp: 5
    },
    measure_humidity: {
        dp: 6
    },
    soil_moisture: {
        dp: 7
    },
    measure_battery: {
        dp: 14
    }
};
    
    this.log('📋 DP Mapping:', JSON.stringify(dpMapping, null, 2));
    
    // Setup DP listeners
    await this.dpEngine.setupDataPoints(dpMapping);
    
    this.log('✅ Soil Tester Temp Humid initialized with Tuya DP Engine');
    
    // Mark available
    await this.setAvailable();
  }
  
  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('Soil Tester Temp Humid deleted');
  }
}

module.exports = SoilSensorDevice;
