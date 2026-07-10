'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Removed non-existent flow card registrations
 * Flow cards must be defined in driver.flow.compose.json first
 */
class RadiatorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorControllerDriver v5.5.476 initialized');
  }
}

module.exports = RadiatorControllerDriver;
