'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
class DiyCustomZigbeeDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
}
module.exports = DiyCustomZigbeeDevice;