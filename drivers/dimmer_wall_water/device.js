'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class DimmerWallWaterDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Dimmer Wall Water hybrid Ready');
  }
}
module.exports = DimmerWallWaterDevice;
