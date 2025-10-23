'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoDimmerDriver initialized');
  }
}

module.exports = AvattoDimmerDriver;
