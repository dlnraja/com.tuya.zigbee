'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Dimmer1gangTouchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Dimmer1gangTouchDriver initialized');
  }
}

module.exports = Dimmer1gangTouchDriver;
