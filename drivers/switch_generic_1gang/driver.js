'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSmartSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaSmartSwitch1gangDriver initialized');
  }
}

module.exports = TuyaSmartSwitch1gangDriver;
