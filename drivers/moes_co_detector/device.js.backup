'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * MOES Carbon Monoxide Detector
 * _TZE200_rjxqso4a, _TZE284_rjxqso4a / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('MOES Carbon Monoxide Detector initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'alarm_co');
    this.registerTuyaDatapoint(13, 'measure_co');
    this.registerTuyaDatapoint(15, 'measure_battery');
    this.registerTuyaDatapoint(101, 'test');
  
  }
}

module.exports = Device;
