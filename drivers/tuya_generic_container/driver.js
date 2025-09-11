'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaGenericContainerDriver extends ZigBeeDriver {

  onInit() {
    this.log('tuya_generic_container driver initialized');
    super.onInit();
  }

}

module.exports = TuyaGenericContainerDriver;
