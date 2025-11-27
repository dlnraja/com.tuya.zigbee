'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');

/**
 * presence_sensor - Hybrid-Enhanced Driver
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
 * Presence Sensor Radar
 * 
 * Manufacturer: _TZE200_rhgsbacq
 * Product ID: TS0601
 * Type: TS0601 (Pure Tuya DP device)
 * 
 * Protocol: Uses Tuya DataPoints (DP) over cluster 0xEF00
 * This device does NOT use standard Zigbee clusters for sensors.
 * All data is transmitted via Tuya proprietary DP protocol.
 */
class PresenceSensorDevice extends HybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Presence Sensor Radar initializing...');
    this.log('Manufacturer:', '_TZE200_rhgsbacq');
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
    alarm_motion: {
        dp: 1
    },
    measure_battery: {
        dp: 4
    }
};
    
    this.log('📋 DP Mapping:', JSON.stringify(dpMapping, null, 2));
    
    // Setup DP listeners
    await this.dpEngine.setupDataPoints(dpMapping);
    
    this.log('✅ Presence Sensor Radar initialized with Tuya DP Engine');
    
    // Mark available
    await this.setAvailable();
  }
  
  /**
   * Called when device is deleted
   */
  async onDeleted() {
    this.log('Presence Sensor Radar deleted');
  }
}

module.exports = PresenceSensorDevice;


module.exports = PresenceSensorDevice;
