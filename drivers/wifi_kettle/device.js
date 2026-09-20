'use strict';

/**
 * P2621 MASTER_ONLY — WiFi Smart Kettle (Tuya Local).
 * WHY: Dedicated driver for Tuya category bh — temperature + keep-warm style kettles.
 * HOW: Default DPs from com.tuyalocal / tuya-local kettle family; registry fills gaps.
 * AGAINST: Pairing kettles as wifi_heater (wrong class / temp range).
 */
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiKettleDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }

  get dpMappings() {
    // Common smart kettle DPs (Aeno / Tuya bh family):
    // DP1 on/off, DP2 current °C, DP4 target °C, DP13 keep-warm (bool → ignored if no cap)
    return {
      1: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      2: { capability: 'measure_temperature', divisor: 1 },
      4: { capability: 'target_temperature', writable: true, divisor: 1 },
      5: { capability: 'measure_temperature', divisor: 1 },
      19: {
        capability: 'alarm_generic',
        transform: (v) => !!(v && Number(v) !== 0),
      },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-KETTLE] Ready');
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    await super.onDeleted();
  }
}

module.exports = WiFiKettleDevice;
