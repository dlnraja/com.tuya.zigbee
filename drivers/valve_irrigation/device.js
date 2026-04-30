'use strict';
const HybridPlugBase = require('../../lib/devices/HybridPlugBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      IRRIGATION VALVE - v5.5.129 FIXED (extends HybridPlugBase properly)    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  This class: dpMappings + startWatering action                              ║
 * ║  DPs: 1,5-7,11,13-15,101-104 | ZCL: 6,1,EF00                               ║
 * ║  Models: TS0601, _TZE200_*, Smart irrigation controller                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const INSOMA_MFRS = ['_tze284_fhvpaltk'];
const IMMAX_MFRS = ['_tze200_xlppj4f5'];

class ValveIrrigationDevice extends HybridPlugBase {

  get plugCapabilities() { return ['onoff', 'measure_battery']; }

  /**
   * v5.11.210: Detect Insoma 2-way irrigation valve for dual-valve DP mapping
   */
  get isInsoma() {
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toLowerCase();
    return INSOMA_MFRS.some(m => mfr.includes(m));
  }

  get dpMappings() {
    const mfr = (this.getSetting('zb_manufacturer_name') || '').toLowerCase();
    const isImmax = IMMAX_MFRS.some(m => mfr.includes(m));

    // v5.11.210: Insoma 2-way valve uses DP 1 (valve1) + DP 2 (valve2) + DP 13 (battery)
    if (this.isInsoma) {
      return {
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        2: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        5: { capability: null, internal: 'countdown_timer', writable: true },
        6: { capability: null, internal: 'remaining_time' },
        13: { capability: 'measure_battery', divisor: 1 },
        14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      };
    }

    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      5: { capability: null, internal: 'countdown_timer', writable: true },
      6: { capability: null, internal: 'remaining_time' },
      7: { capability: 'meter_water', divisor: 1 },
      11: { capability: null, internal: 'weather_delay', writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === 'low' },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: isImmax ? 'meter_water' : null, internal: isImmax ? null : 'last_water_time', divisor: 1000 },
      102: { capability: null, internal: 'water_cycle', writable: true },
      103: { capability: null, internal: 'frost_protection', writable: true },
      104: { capability: 'meter_water', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    // Parent handles onoff listener - DO NOT re-register
    await super.onNodeInit({ zclNode });
    this.log('[VALVE-IRR] v5.5.129 - DPs: 1,5-7,11,13-15,101-104 | ZCL: 6,1,EF00');

    // Add meter_water capability if not present
    if (!this.hasCapability('meter_water')) {
      try { await this.addCapability('meter_water'); } catch (e) { /* ignore */ }
    }

    this.log('[VALVE-IRR] ✅ Ready');
  }

  async startWatering(minutes) {
    this.log(`[VALVE-IRR] 💧 Starting watering for ${minutes} minutes`);
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      await tuya.datapoint({ dp: 5, value: minutes, type: 'value' });
      await tuya.datapoint({ dp: 1, value: true, type: 'bool' });
    }
  }


  async onDeleted() {
    // Clean up timers to prevent memory leaks
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    this.log('Device deleted, cleaning up');
  }
}

module.exports = ValveIrrigationDevice;
