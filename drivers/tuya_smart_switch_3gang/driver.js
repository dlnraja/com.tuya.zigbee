'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSmartSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaSmartSwitch3gangDriver initialized');
  }
}

module.exports = TuyaSmartSwitch3gangDriver;
