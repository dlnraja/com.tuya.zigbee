'use strict';

const { TuyaSpecificClusterDevice } = require('../../lib/TuyaSpecificClusterDevice');

/**
 * Zigbee Curtain Motor
 * _TZE200_nv6nxo0c / TS0601
 */
class Device extends TuyaSpecificClusterDevice {

  async onNodeInit({ zclNode }) {
    this.log('Zigbee Curtain Motor initialized');

    // Tuya Datapoint Handling
    this.registerTuyaDatapoint(1, 'windowcoverings_state');
    this.registerTuyaDatapoint(2, 'windowcoverings_set');
  
  }
}

module.exports = Device;
