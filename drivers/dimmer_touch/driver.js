'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoDimmerTouchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoDimmerTouchDriver initialized');
  }
}

module.exports = AvattoDimmerTouchDriver;
