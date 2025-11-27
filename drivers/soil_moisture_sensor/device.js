'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');

/**
 * soil_moisture_sensor - Hybrid-Enhanced Driver
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
 * Soil Moisture Sensor
 * _TZE284_sgabhwa6, _TZE284_aao3yzhs / TS0601
 */
class Device extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Soil Moisture Sensor initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(3, 'measure_humidity.soil');
    this.registerTuyaDatapoint(5, 'measure_temperature');
    this.registerTuyaDatapoint(15, 'measure_battery');
  
  }
}

module.exports = Device;


module.exports = Device;
