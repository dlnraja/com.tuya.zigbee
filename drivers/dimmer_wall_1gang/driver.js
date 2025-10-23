'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoDimmer1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoDimmer1gangDriver initialized');
  }
}

module.exports = AvattoDimmer1gangDriver;
