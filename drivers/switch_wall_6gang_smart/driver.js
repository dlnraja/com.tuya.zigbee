'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartSwitch6gangDriver initialized');
  }
}

module.exports = AvattoSmartSwitch6gangDriver;
