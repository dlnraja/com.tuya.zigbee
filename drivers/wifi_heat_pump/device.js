'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {

/**
 * P2621 MASTER_ONLY - WiFi Heat Pump (Tuya Local).
 * WHY: Dedicated driver for Tuya category rs/rsx (pool / air-water HPs) -
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
      // Phalén / Fairland InverterPlus (optional - gaps filled if present)
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
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        const settings = (typeof this.getSettings === 'function' ? this.getSettings() : null) || {};
        const dp = Number(settings.packed_setpoint_dp);
        const field = Number(settings.packed_setpoint_field);
        if (Number.isInteger(dp) && dp > 0 && Number.isInteger(field) && field > 0) {
          const PackedStructDP = require('../../lib/tuya-local/PackedStructDP');
          const wr = PackedStructDP.buildWrite(this._packedStructStore, dp, field, Math.round(Number(value)));
          if (!wr.ok) {
            throw new Error('Packed setpoint write needs a reported block first');
          }
          await this._setDP(dp, wr.payload, { capability: 'target_temperature', userAction: true });
          return;
        }
        const mapped = (this.capabilityMap || []).find((c) => c && c.capability === 'target_temperature');
        if (mapped) {
          const dpValue = mapped.toDevice ? mapped.toDevice(value) : value;
          await this._setDP(mapped.dp, dpValue, { capability: 'target_temperature', userAction: true });
        }
      });
    }
    this.log('[WIFI-HEAT-PUMP] Ready');
  }

  async onDeleted() {
    if (this._destroyed) {return;}
    this._destroyed = true;
    await super.onDeleted();
  }
}

module.exports = WiFiHeatPumpDevice;
return module.exports;
});
