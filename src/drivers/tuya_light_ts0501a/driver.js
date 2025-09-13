'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightTs0501aDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_ts0501a driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightTs0501aDriver;
