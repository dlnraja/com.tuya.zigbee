'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class TuyaGasSensorTs0601Driver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaGasSensorTs0601Driver v5.5.476 initialized');
  }
}

module.exports = TuyaGasSensorTs0601Driver;
