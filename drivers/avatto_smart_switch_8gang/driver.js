'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartSwitch8gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartSwitch8gangDriver initialized');
  }
}

module.exports = AvattoSmartSwitch8gangDriver;
