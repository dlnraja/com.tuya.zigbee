'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch4gangDriver initialized');
  }
}

module.exports = SmartSwitch4gangDriver;
