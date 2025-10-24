'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSwitch3gangDriver initialized');
  }
}

module.exports = SmartSwitch3gangDriver;
