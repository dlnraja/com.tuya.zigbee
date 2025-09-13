'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CommonDriver extends ZigBeeDriver {

  onInit() {
    this.log('common driver initialized');
    super.onInit();
  }

}

module.exports = CommonDriver;
