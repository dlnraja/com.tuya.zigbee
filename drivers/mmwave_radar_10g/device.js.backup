'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * 10G mmWave Radar Multi-Sensor
 * _TZE200_ar0slwnd, _TZE200_sfiy5tfs / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('10G mmWave Radar Multi-Sensor initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'alarm_motion');
    this.registerTuyaDatapoint(19, 'measure_distance');
    this.registerTuyaDatapoint(104, 'measure_temperature');
    this.registerTuyaDatapoint(105, 'measure_humidity');
    this.registerTuyaDatapoint(106, 'measure_luminance');
  
  }
}

module.exports = Device;
