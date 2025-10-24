'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch8gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch8gangDriver initialized');
  }
}

module.exports = SmartSwitch8gangDriver;
