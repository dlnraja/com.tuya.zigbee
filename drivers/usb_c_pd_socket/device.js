'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');

/**
 * usb_c_pd_socket - Hybrid-Enhanced Driver
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
 * Wall Socket USB-C PD
 * _TZE200_dcrrztpa / TS0601
 */
class Device extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('Wall Socket USB-C PD initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'onoff');
    this.registerTuyaDatapoint(6, 'measure_power');
    this.registerTuyaDatapoint(17, 'meter_power');
  
  }
}

module.exports = Device;


module.exports = Device;
