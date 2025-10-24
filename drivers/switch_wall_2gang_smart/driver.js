'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartSwitch2gangDriver initialized');
  }
}

module.exports = AvattoSmartSwitch2gangDriver;
