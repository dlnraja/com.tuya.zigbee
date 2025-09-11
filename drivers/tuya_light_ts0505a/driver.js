'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightTs0505aDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_ts0505a driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightTs0505aDriver;
