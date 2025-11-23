'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * TS0503B RGB LED Strip Controller
 * Issue #34
 */
class TS0503BDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('TS0503B LED Strip init...');

    // OnOff
    this.registerCapability('onoff', 6, {
      endpoint: 1
    });

    // Dim
    this.registerCapability('dim', 8, {
      endpoint: 1
    });

    // Color (Hue/Sat)
    this.registerCapability('light_hue', 0x0300, {
      endpoint: 1
    });
    this.registerCapability('light_saturation', 0x0300, {
      endpoint: 1
    });

    this.log('✅ TS0503B ready');
  }
}

module.exports = TS0503BDevice;
