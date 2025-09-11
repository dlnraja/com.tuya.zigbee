'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeTuyaUniversalDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_zigbee-tuya-universal driver initialized');
    super.onInit();
  }

}

module.exports = TuyaZigbeeTuyaUniversalDriver;
