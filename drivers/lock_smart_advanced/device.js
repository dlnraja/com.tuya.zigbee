'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * lock_smart_advanced - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';


const TuyaDataPointsComplete = require('../../lib/TuyaDataPointsComplete');

class LockSmartAdvancedDevice extends HybridDevice {
  
  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Smart Lock Advanced initializing...');
    
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
      "1": "locked",
      "2": "lock_mode",
      "14": "measure_battery",
      "71": "alarm_tamper"
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
    
    this.log('Smart Lock Advanced initialized');
  }
}

module.exports = LockSmartAdvancedDevice;


module.exports = LockSmartAdvancedDevice;
