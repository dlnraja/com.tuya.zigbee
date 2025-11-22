'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * Multi-Sensor (Motion, Temp, Humidity, Light)
 * HOBEIAN, _TZE200_3towulqd / ZG-204ZV, TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
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
