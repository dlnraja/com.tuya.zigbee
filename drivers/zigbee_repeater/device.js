'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

class ZigbeeRepeaterDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { await super.onNodeInit({ zclNode  });
      this.log('[REPEATER] Zigbee signal repeater initialized');
      this.log('[REPEATER] This device acts as a Zigbee router to extend network range');
    }, 'onNodeInit');
  }
}

module.exports = ZigbeeRepeaterDevice;
return module.exports;
});
