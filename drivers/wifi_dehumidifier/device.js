'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiDehumidifierDevice extends TuyaLocalDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  get dpMappings() {
    return {
      '1':  { capability: 'onoff', writable: true, transform: (v) => !!v, reverseTransform: (v) => !!v },
      '2':  { capability: 'unknown' }, // mode: auto/manual/dry_clothes/sleep
      '4':  { capability: 'unknown' }, // fan speed: low/mid/high | tuya-local: "speed" (x30/34 devices)
      '5':  { capability: 'target_humidity', writable: true },
      '6':  { capability: 'measure_humidity' },
      '7':  { capability: 'measure_temperature' },
      '11': { capability: 'alarm_water', transform: (v) => !!v },
      '12': { capability: 'child_lock', transform: (v) => v === true || v === 1 },
      '13': { capability: 'unknown' }, // anion (ionizer)
      '14': { capability: 'countdown_remaining' },
      '101': { capability: 'unknown' }, // defrost
      '102': { capability: 'unknown' }, // filter_reset
    };
  }

  /**
   * P3372 (forum 146735 #509): the declared "Water tank is full" card was never fired.
   * Fire it on the rising edge of alarm_water, whatever DP set it.
   */
  async _setLocalCapabilityValue(capability, value) {
    const was = capability === 'alarm_water' && typeof this.getCapabilityValue === 'function'
      ? this.getCapabilityValue('alarm_water') === true : null;
    const res = await super._setLocalCapabilityValue(capability, value);
    if (capability === 'alarm_water' && value === true && was === false) {
      this.triggerFlowCard?.('wifi_dehumidifier_water_full').catch?.(() => {});
    }
    return res;
  }

  async onInit() {
    await super.onInit();
    for (const cap of ['measure_humidity', 'measure_temperature', 'alarm_water', 'target_humidity']) {
      if (!this.hasCapability(cap)) {
        try { await this.addCapability(cap); } catch (e) { /* optional */ }
      }
    }
    this.log('[WIFI-DEHUMIDIFIER] Ready');
  }


  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    this.log('Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = WiFiDehumidifierDevice;
return module.exports;
});
