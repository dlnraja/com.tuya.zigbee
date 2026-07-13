'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { stringifyDPValue } = require('../../lib/tuya-local/DPValueParser');

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

  async _processDPUpdate(dps) {
    await super._processDPUpdate(dps);
    this.log('[WIFI-GENERIC] Raw DPs:', JSON.stringify(dps));

    const discovered = this._mergeDiscoveredDPs(dps);
    if (discovered.changed) {
      this.setSettings({ discovered_dps: JSON.stringify(discovered.value) }).catch(() => {});
    }

    const triggers = Object.entries(dps || {}).map(([dp, value]) => {
      return this.triggerFlowCard('wifi_generic_dp_changed', {
        dp: String(dp),
        value: stringifyDPValue(value),
      }).catch(() => false);
    });
    await Promise.all(triggers);
  }

  _mergeDiscoveredDPs(dps) {
    let current = {};
    try {
      current = JSON.parse(this.getSetting?.('discovered_dps') || '{}') || {};
    } catch (_) {
      current = {};
    }

    let changed = false;
    for (const [dp, value] of Object.entries(dps || {})) {
      if (!Object.prototype.hasOwnProperty.call(current, dp)) {
        current[dp] = value;
        changed = true;
      }
    }
    return { changed, value: current };
  }


  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}
module.exports = WiFiGenericDevice;
