'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch6gangDriver initialized');
  }
}

module.exports = SmartSwitch6gangDriver;
