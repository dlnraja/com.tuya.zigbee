'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BaseDriver extends ZigBeeDriver {

  onInit() {
    this.log('_base driver initialized');
    super.onInit();
  }

}

module.exports = BaseDriver;
