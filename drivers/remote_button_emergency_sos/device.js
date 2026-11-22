'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Smart Remote 4 Buttons - TS0215A
 * 4-button battery remote using ZCL scenes/onOff clusters
 * v5.12.0: Converted from log-only stub to full ButtonDevice
 */
class SmartRemote4ButtonsDevice extends ButtonDevice {
  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { this.buttonCount = 4;
      this.log('[SMART_REMOTE_4_BUTTONS] v5.12.0 init - 4 buttons');
      await Promise.resolve().then(() => super.onNodeInit({ zclNode })).catch(err => this.error('[SMART_REMOTE_4_BUTTONS] init err:', err.message));
      this.log('[SMART_REMOTE_4_BUTTONS] ready');
     }, 'onNodeInit');
  }


  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartRemote4ButtonsDevice;
return module.exports;
});
