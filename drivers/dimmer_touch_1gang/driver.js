'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoDimmer1gangTouchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoDimmer1gangTouchDriver initialized');
  }
}

module.exports = AvattoDimmer1gangTouchDriver;
