'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightTs0505bDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_ts0505b driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightTs0505bDriver;
