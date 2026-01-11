'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class Dimmer1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Dimmer1gangDriver v5.5.476 initialized');
  }
}

module.exports = Dimmer1gangDriver;
