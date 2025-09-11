'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightTs0502bDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_ts0502b driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightTs0502bDriver;
