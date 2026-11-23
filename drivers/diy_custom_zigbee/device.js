'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
class DiyCustomZigbeeDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
}
module.exports = DiyCustomZigbeeDevice;
return module.exports;
});
