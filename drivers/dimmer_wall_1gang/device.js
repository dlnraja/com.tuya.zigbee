'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class DimmerWall1GangDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('Dimmer Wall 1-Gang Ready');
  }
}
module.exports = DimmerWall1GangDevice;
