'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');


const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART CIRCUIT BREAKER - v9.7.3 UNIVERSAL                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Standardized via Unified Architecture:                                       ║
 * ║  - BatteryMixin (tuya/v9.6.0) for standard battery monitoring                ║
 * ║  - UnifiedPlugBase for core relay logic, energy monitoring, and              ║
 * ║    Tuya DP/ZCL hybrid support.                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartBreakerDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedPlugBase)) {

  async onNodeInit({ zclNode }) {
    await this._safeInvoke(async () => { // v9.7.3: Initialization is orchestrated by the mixin hierarchy.
      // Handles relay control, energy monitoring, and battery status.
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('[BREAKER] ✅ v9.7.3 Universal initialization complete');
    }, 'onNodeInit');
  }

  // v9.7.3: Enhanced DP mappings for circuit breaker specific functions
  // Supports: standard breakers (DP1/16-20/101) + TOWSMR1-40 RCBO (DP1/6-10)
  get dpMappings() {
    const parentMappings = super.dpMappings || {};
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toUpperCase();
    const isTOWSMR1 = mfr.includes('4MA5PUFE');

    // #108: Tongou TOQCB2-80 family (exact suffixes from ZHC tuya.ts). DP1 is energy, not
    // on/off; the switch is DP16; DP6-8 are 8-byte phase structs handled in _handleDP.
    if (this._isToqcb280()) {
      return {
        ...parentMappings,
        1: { capability: 'meter_power', divisor: 100 },
        16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      };
    }
    // P3067 family 9: ZBN-DJ-63 (Z2M tuya.ts) shares the TOQCB2-80 layout; DP9 is the fault bitmap (0 = clear).
    if (this._isZbnDj63()) {
      return {
        ...parentMappings,
        1: { capability: 'meter_power', divisor: 100 },
        9: { capability: 'alarm_generic', transform: (v) => Number(v) !== 0 },
        16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      };
    }

    // TOWSMR1-40 RCBO uses different DP layout: DP6-8 for energy, DP9=energy, DP10=fault
    if (isTOWSMR1) {
      return {
        ...parentMappings,
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        6: { capability: 'measure_voltage', smartDivisor: true },
        7: { capability: 'measure_current', smartDivisor: true },
        8: { capability: 'measure_power', divisor: 1 },
        9: { capability: 'meter_power', smartDivisor: true },
        10: { capability: 'alarm_generic', transform: (v) => !!v },
      };
    }

    return {
      ...parentMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      9: { capability: 'alarm_generic', transform: (v) => !!v },  // Trip alarm
      26: { capability: 'alarm_generic', transform: (v) => !!v }, // Alternative trip alarm
      17: { capability: 'measure_current', smartDivisor: true },
      20: { capability: 'measure_current', smartDivisor: true },
      18: { capability: 'measure_power', divisor: 1 },
      19: { capability: 'measure_voltage', smartDivisor: true },
      101: { capability: 'meter_power', smartDivisor: true }
    };
  }

  _isToqcb280() {
    const mfr = String(this.getSetting('zb_manufacturer_name') || '').toLowerCase();
    return /_(kv1nvirl|lyqazpe6|9xstqowh|mrffaamu)$/.test(mfr);
  }

  _hasPhaseStruct() {
    return this._isToqcb280() || this._isZbnDj63();
  }

  _isZbnDj63() {
    return /_lb0fsvba$/.test(String(this.getSetting('zb_manufacturer_name') || '').toLowerCase());
  }

  // P3067 family 9: ZBN-DJ-63 DP103 temperature (raw °C), DP15 leakage current (mA) and DP110 reverse
  // energy (kWh /100), Z2M tuya.ts. Temperature is added late; the others are kept in the store.
  _handleZbnDj63Dp(id, rawValue) {
    if (id !== 103 && id !== 15 && id !== 110) {return false;}
    const v = Number(rawValue);
    if (!Number.isFinite(v)) {return true;}
    if (id === 103) {
      if (v > -40 && v < 150) {require('../../lib/helpers/LateCapability').ensureAndSet(this, 'measure_temperature', v).catch(() => {});}
      return true;
    }
    if (id === 15 || id === 110) {
      Promise.resolve().then(() => this.setStoreValue(id === 15 ? 'leakage_current_ma' : 'reverse_energy_kwh', id === 15 ? v : v / 100)).catch(() => {});
      return true;
    }
    return false;
  }

  // #108: phase A struct feeds the main V/A/W tiles; B and C are logged only (P2519).
  _handleDP(dpId, rawValue) {
    const id = Number(dpId);
    if (this._isZbnDj63() && this._handleZbnDj63Dp(id, rawValue)) {return;}
    if ((id === 6 || id === 7 || id === 8) && this._hasPhaseStruct()) {
      const ph = require('../../lib/tuya/TuyaPhaseStruct').decodePhaseVariant2(rawValue);
      if (!ph) {return;}
      if (id !== 6) {
        this.log(`[BREAKER] phase ${id === 7 ? 'B' : 'C'}: ${ph.voltage} V ${ph.current} A ${ph.power} W`);
        return;
      }
      this.safeSetCapabilityValue('measure_voltage', ph.voltage);
      this.safeSetCapabilityValue('measure_current', ph.current);
      this.safeSetCapabilityValue('measure_power', ph.power);
      return;
    }
    // P3064: TOQCB2-80 internal temperature, DP131 in 0.1 °C (Z2M tuya.ts TOQCB2-80 exposes
    // e.temperature(); facts only). Added late on the exact couples, never at pairing.
    if (id === 131 && this._isToqcb280()) {
      const t = Number(rawValue) / 10;
      if (Number.isFinite(t) && t > -40 && t < 150) {
        require('../../lib/helpers/LateCapability').ensureAndSet(this, 'measure_temperature', t).catch(() => {});
      }
      return;
    }
    return super._handleDP(dpId, rawValue);
  }

  onDeleted() {
    super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = SmartBreakerDevice;
