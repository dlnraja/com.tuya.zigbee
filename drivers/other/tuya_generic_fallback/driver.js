'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaGenericFallbackDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_generic_fallback driver initialized');
    super.onInit();
  }

}

module.exports = TuyaGenericFallbackDriver;
