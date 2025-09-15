'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaTs011fDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya-ts011f driver initialized');
    super.onInit();
  }

}

module.exports = TuyaTs011fDriver;
