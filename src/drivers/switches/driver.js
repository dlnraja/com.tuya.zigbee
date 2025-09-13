'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchesDriver extends ZigBeeDriver {

  onInit() {
    this.log('switches driver initialized');
    super.onInit();
  }

}

module.exports = SwitchesDriver;
