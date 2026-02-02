'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ZigbeeRepeaterDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('[REPEATER] Zigbee signal repeater initialized');
    this.log('[REPEATER] This device acts as a Zigbee router to extend network range');
  }
}

module.exports = ZigbeeRepeaterDevice;
