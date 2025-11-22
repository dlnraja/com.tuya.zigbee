'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * Wall Socket USB-C PD
 * _TZE200_dcrrztpa / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('Wall Socket USB-C PD initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'onoff');
    this.registerTuyaDatapoint(6, 'measure_power');
    this.registerTuyaDatapoint(17, 'meter_power');
  
  }
}

module.exports = Device;
