'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Simplified, SDK3 auto-registers flow cards from driver.flow.compose.json
 */
class Driver extends ZigBeeDriver {
  async onInit() {
    this.log('air_quality_co2 driver v5.5.476 init');
  }
}

module.exports = Driver;
