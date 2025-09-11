'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaTuyaDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_tuya driver initialized');
    super.onInit();
  }

}

module.exports = TuyaTuyaDriver;
