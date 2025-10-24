'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSwitch2gangDriver initialized');
  }
}

module.exports = AvattoSwitch2gangDriver;
