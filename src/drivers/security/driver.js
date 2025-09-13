'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SecurityDriver extends ZigBeeDriver {

  onInit() {
    this.log('security driver initialized');
    super.onInit();
  }

}

module.exports = SecurityDriver;
