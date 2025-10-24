'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartSpotDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartSpotDriver initialized');
  }
}

module.exports = AvattoSmartSpotDriver;
