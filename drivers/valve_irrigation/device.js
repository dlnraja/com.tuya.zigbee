'use strict';
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');


const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const { containsCI } = require('../../lib/utils/CaseInsensitiveMatcher');
const { ensureManufacturerSettings } = require('../../lib/helpers/ManufacturerNameHelper');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      IRRIGATION VALVE - v9.7.3 UNIFIED (extends UnifiedPlugBase properly)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ UnifiedPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  BatteryMixin handles: battery reporting and measurement                    ║
 * ║  DPs: 1,2,5-7,11,13-15,101-104 | ZCL: 6,1,EF00                              ║
 * ║  Models: TS0601, _TZE200_*, Smart irrigation controller                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const INSOMA_MFRS = ['_tze284_fhvpaltk', '_TZE284_fhvpaltk', '_TZE284_FHVPALTK'];
const IMMAX_MFRS = ['_tze200_xlppj4f5'];

class ValveIrrigationDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {

  get plugCapabilities() { 
    return ['onoff', 'measure_battery', 'meter_water']; 
  }

  /**
   * v5.11.210: Detect Insoma 2-way irrigation valve for dual-valve DP mapping
   */
  get isInsoma() {
    const mfr = this.getSetting('zb_manufacturer_name') || '';
    return INSOMA_MFRS.some(m => containsCI(mfr, m));
  }

  get dpMappings() {
    const mfr = this.getSetting('zb_manufacturer_name') || '';
    const isImmax = IMMAX_MFRS.some(m => containsCI(mfr, m));

    // v5.11.210: Insoma 2-way valve uses DP 1 (valve1) + DP 2 (valve2) + DP 13 (battery)
    if (this.isInsoma) {
      return {
        1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
        2: { capability: 'onoff.gang2', transform: (v) => v === 1 || v === true },
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
    await this._safeInvoke(async () => { // v9.7.3: Unified initialization handles reporting and protocol setup
      // v9.8.0: Ensure manufacturer settings populated BEFORE isInsoma check
      await ensureManufacturerSettings(this).catch(err => this.error('[VALVE-IRR] ensureManufacturerSettings failed:', err.message));

      // Dynamic capabilities setup based on Insoma model detection
      if (this.isInsoma) {
        this.log('[VALVE-IRR] Insoma Dual Valve detected. Stripping dimming levels, ensuring dual on/off switches.');
        // Remove 4-way dim levels
        for (const cap of ['dim.valve_1', 'dim.valve_2', 'dim.valve_3', 'dim.valve_4']) {
          if (this.hasCapability(cap)) {
            await this.removeCapability(cap).catch(err => this.error(`Failed to remove ${cap}:`, err.message));
          }
        }
        // Add dual gang onoff
        if (!this.hasCapability('onoff.gang2')) {
          await this.addCapability('onoff.gang2').catch(err => this.error(`Failed to add onoff.gang2:`, err.message));
        }
      } else {
        // Non-Insoma 4-way valve: ensure dim levels, remove gang2 onoff
        this.log('[VALVE-IRR] Standard 4-Way Valve detected.');
        if (this.hasCapability('onoff.gang2')) {
          await this.removeCapability('onoff.gang2').catch(err => this.error(`Failed to remove onoff.gang2:`, err.message));
        }
        for (const cap of ['dim.valve_1', 'dim.valve_2', 'dim.valve_3', 'dim.valve_4']) {
          if (!this.hasCapability(cap)) {
            await this.addCapability(cap).catch(err => this.error(`Failed to add ${cap}:`, err.message));
          }
        }
      }

      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();

      // Register capability listener for gang2 if present
      if (this.hasCapability('onoff.gang2')) {
        this.registerCapabilityListener('onoff.gang2', async (value) => {
          this.log(`[VALVE-IRR] UI Toggle Gang 2: ${value}`);
          if (this.tuyaEF00Manager) {
            await this.tuyaEF00Manager.sendDP(2, value ? 1 : 0, 'bool');
          } else {
            this.log('[VALVE-IRR] ⚠️ tuyaEF00Manager not ready for gang 2');
          }
        });
      }

      this.log('[VALVE-IRR] v9.7.3 - DPs: 1,5-7,11,13-15,101-104 | ZCL: 6,1,EF00');
      this.log('[VALVE-IRR] ✅ Ready');
    }, 'onNodeInit');
  }

  /**
   * Custom action for flow cards
   * @param {number} minutes 
   */
  async startWatering(minutes) {
    this.log(`[VALVE-IRR] 💧 Starting watering for ${minutes} minutes`);
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      await tuya.datapoint({ dp: 5, value: minutes, type: 'value' });
      await tuya.datapoint({ dp: 1, value: true, type: 'bool' });
    }
  }

  async onDeleted() {
    // Clean up timers to prevent memory leaks (inherited from UnifiedPlugBase if needed, but keeping for safety)
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    await super.onDeleted();
    this.log('Device deleted, cleaning up');
  }
}

module.exports = ValveIrrigationDevice;
