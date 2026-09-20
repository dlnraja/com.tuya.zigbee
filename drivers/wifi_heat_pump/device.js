'use strict';

/**
 * P2621 MASTER_ONLY — WiFi Heat Pump (Tuya Local).
 * WHY: Dedicated driver for Tuya category rs/rsx (pool / air-water HPs) —
 *   formerly only wifi_generic + category hints (P2619).
 * HOW: TuyaLocalDevice + default DP map (Brustec/BWT/standard) + WiFiDPRegistry enrich.
 * WHO: Homey Pro users with LAN Tuya heat pumps.
 * WHEN: Pair via WiFi Heat Pump; Repair reuses configure.
 * AGAINST: Routing pool HPs into wifi_heater / wifi_thermostat with wrong DPs.
 */
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');

class WiFiHeatPumpDevice extends TuyaLocalDevice {
  get mainsPowered() { return true; }

  get dpMappings() {
    // Standard pool HP layout (Brustec / BWT / Madimack / Waterco family).
    // Phalén / Fairland 100-range DPs are filled by WiFiDPRegistry when
    // settings.category / product_id match community hints.
    return {
      1: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      2: { capability: 'target_temperature', writable: true, divisor: 1 },
      3: { capability: 'measure_temperature', divisor: 1 },
      9: {
        capability: 'alarm_generic',
        transform: (v) => !!(v && Number(v) !== 0),
      },
      // Phalén / Fairland InverterPlus (optional — gaps filled if present)
      101: {
        capability: 'onoff',
        writable: true,
        transform: (v) => v === true || v === 1,
        reverseTransform: (v) => v === true,
      },
      102: { capability: 'measure_temperature', divisor: 1 },
      106: { capability: 'target_temperature', writable: true, divisor: 1 },
    };
  }

  async onInit() {
    await super.onInit();
    this.log('[WIFI-HEAT-PUMP] Ready');
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    await super.onDeleted();
  }
}

module.exports = WiFiHeatPumpDevice;
