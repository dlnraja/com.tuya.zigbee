'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightTs0502aDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_ts0502a driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightTs0502aDriver;
