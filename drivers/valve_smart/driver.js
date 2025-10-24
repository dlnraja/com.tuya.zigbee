'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ValveSmartDriver initialized');
  }
}

module.exports = ValveSmartDriver;
