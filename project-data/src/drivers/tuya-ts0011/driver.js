'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaTs0011Driver extends ZigBeeDriver {

  onInit() {
    this.log('tuya-ts0011 driver initialized');
    super.onInit();
  }

}

module.exports = TuyaTs0011Driver;
