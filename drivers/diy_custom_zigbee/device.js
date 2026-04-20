'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class DiyCustomZigbeeDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
}
module.exports = DiyCustomZigbeeDevice;