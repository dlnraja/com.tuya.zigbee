'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class ButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ButtonWirelessDriver v5.5.476 initialized');
  }
}

module.exports = ButtonWirelessDriver;
