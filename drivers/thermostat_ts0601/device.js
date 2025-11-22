'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * Zigbee Thermostat
 * _TZE200_9xfjixap / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('Zigbee Thermostat initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(2, 'thermostat_mode');
    this.registerTuyaDatapoint(16, 'measure_temperature');
    this.registerTuyaDatapoint(24, 'target_temperature');
  
  }
}

module.exports = Device;
