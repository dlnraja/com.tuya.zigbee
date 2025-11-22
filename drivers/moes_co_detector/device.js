'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * moes_co_detector - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * MOES Carbon Monoxide Detector
 * _TZE200_rjxqso4a, _TZE284_rjxqso4a / TS0601
 */
class Device extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('MOES Carbon Monoxide Detector initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'alarm_co');
    this.registerTuyaDatapoint(13, 'measure_co');
    this.registerTuyaDatapoint(15, 'measure_battery');
    this.registerTuyaDatapoint(101, 'test');
  
  }
}

module.exports = Device;


module.exports = Device;
