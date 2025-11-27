'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * zg_204zv_multi_sensor - Hybrid-Enhanced Driver
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
 * Multi-Sensor (Motion, Temp, Humidity, Light)
 * HOBEIAN, _TZE200_3towulqd / ZG-204ZV, TS0601
 */
class Device extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Multi-Sensor (Motion, Temp, Humidity, Light) initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'alarm_motion');
    this.registerTuyaDatapoint(3, 'measure_temperature');
    this.registerTuyaDatapoint(4, 'measure_humidity');
    this.registerTuyaDatapoint(9, 'measure_luminance');
    this.registerTuyaDatapoint(15, 'measure_battery');
  
  }
}

module.exports = Device;


module.exports = Device;
