'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * Smart Knob (Rotary Controller)
 * _TZ3000_gwkzibhs, _TZ3000_4fjiwweb / TS004F
 */
class Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Smart Knob (Rotary Controller) initialized');

    // Standard Zigbee capabilities
    await super.onNodeInit({ zclNode });
  
  }
}

module.exports = Device;
