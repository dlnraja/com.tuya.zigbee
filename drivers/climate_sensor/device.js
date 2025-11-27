'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * climate_sensor - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';


const TuyaDataPointEngine = require('../../lib/tuya/TuyaDataPointEngine');

/**
 * Climate Monitor
 * 
 * Manufacturer: _TZE284_vvmbj46n
 * Product ID: TS0601
 * Type: TS0601 (Pure Tuya DP device)
 * 
 * Protocol: Uses Tuya DataPoints (DP) over cluster 0xEF00
 * This device does NOT use standard Zigbee clusters for sensors.
 * All data is transmitted via Tuya proprietary DP protocol.
 */
class ClimateSensorDevice extends HybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Climate Monitor initializing...');
    this.log('Manufacturer:', '_TZE284_vvmbj46n');
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
        dp: 1
    },
    measure_humidity: {
        dp: 2
    },
    measure_battery: {
        dp: 4
    }
};
    
    this.log('📋 DP Mapping:', JSON.stringify(dpMapping, null, 2));
    
    // Setup DP listeners
    await this.dpEngine.setupDataPoints(dpMapping);
    
    this.log('✅ Climate Monitor initialized with Tuya DP Engine');
    
    // Mark available
    await this.setAvailable();
  }
  
  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('Climate Monitor deleted');
  }
}

module.exports = ClimateSensorDevice;


module.exports = ClimateSensorDevice;
