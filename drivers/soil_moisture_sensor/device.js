'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * Soil Moisture Sensor
 * _TZE284_sgabhwa6, _TZE284_aao3yzhs / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('Soil Moisture Sensor initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(3, 'measure_humidity.soil');
    this.registerTuyaDatapoint(5, 'measure_temperature');
    this.registerTuyaDatapoint(15, 'measure_battery');
  
  }
}

module.exports = Device;
