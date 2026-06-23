'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WiFiGenericDevice extends TuyaLocalDevice {
  get dpMappings() {
    return {
      '1': { capability: 'onoff', writable: true, transform: (v) => v === true || v === 1, reverseTransform: (v) => v === true },
    };
  }
  async onInit() {
    await super.onInit();
    this.log('[WIFI-GENERIC] Generic Tuya WiFi device ready');
  }

  _processDPUpdate(dps) {
    super._processDPUpdate(dps);
    this.log('[WIFI-GENERIC] Raw DPs:', JSON.stringify(dps));
    this.setSettings({ discovered_dps: JSON.stringify(dps) }).catch(() => {});
  }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}
module.exports = WiFiGenericDevice;
