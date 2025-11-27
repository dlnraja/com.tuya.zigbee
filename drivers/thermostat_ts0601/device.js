'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * thermostat_ts0601 - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/tuya/TuyaSpecificClusterDevice');

/**
 * Zigbee Thermostat
 * _TZE200_9xfjixap / TS0601
 */
class Device extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Zigbee Thermostat initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(2, 'thermostat_mode');
    this.registerTuyaDatapoint(16, 'measure_temperature');
    this.registerTuyaDatapoint(24, 'target_temperature');
  
  }
}

module.exports = Device;


module.exports = Device;
