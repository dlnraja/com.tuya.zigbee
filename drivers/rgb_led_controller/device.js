'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');

/**
 * RGB LED Strip Controller
 * _TZ3000_i8l0nqdu, _TZ3210_a5fxguxr, _TZ3000_g5xawfcq, _TZ3210_trm3l2aw, _TZ3210_0zabbfax, _TZ3210_95txyzbx / TS0503B
 */
class Device extends ZigBeeLightDevice {

  async onNodeInit({ zclNode }) {
    this.log('RGB LED Strip Controller initialized');

    // Standard Zigbee capabilities
    await super.onNodeInit({ zclNode });
  
  }
}

module.exports = Device;
