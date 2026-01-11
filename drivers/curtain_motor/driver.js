'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('curtain_motor driver v5.5.476 initialized');
  }
}

module.exports = TuyaZigbeeDriver;
