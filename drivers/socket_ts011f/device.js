'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Power Monitoring Socket
 * _TZ3210_cehuw1lw, _TZ3210_fgwhjm9j / TS011F
 */
class Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Power Monitoring Socket initialized');

    // Standard Zigbee capabilities
    await super.onNodeInit({ zclNode });
  
  }
}

module.exports = Device;
