'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch1gangDriver initialized');
  }
}

module.exports = SmartSwitch1gangDriver;
