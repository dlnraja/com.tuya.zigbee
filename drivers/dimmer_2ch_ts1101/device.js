'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * 2-Channel Dimmer Module
 * _TZ3000_7ysdnebc / TS1101
 */
class Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('2-Channel Dimmer Module initialized');

    // Standard Zigbee capabilities
    await super.onNodeInit({ zclNode });
  
  }
}

module.exports = Device;
