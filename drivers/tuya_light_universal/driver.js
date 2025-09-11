'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaLightUniversalDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_light_universal driver initialized');
    super.onInit();
  }

}

module.exports = TuyaLightUniversalDriver;
