'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch2gangDriver initialized');
  }
}

module.exports = SmartSwitch2gangDriver;
