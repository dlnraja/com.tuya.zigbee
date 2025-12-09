'use strict';

const { HybridPlugBase } = require('../../lib/devices');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      SMART PLUG - v5.5.129 FIXED (extends HybridPlugBase properly)          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridPlugBase handles: onoff listener, Tuya DP, ZCL On/Off                ║
 * ║  This class ONLY: dpMappings + ZCL energy monitoring listeners              ║
 * ║  DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00                          ║
 * ║  Manufacturer IDs: _TZ3000_*, _TYZB01_*, TS011F, TS0121                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class SmartPlugDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      7: { capability: null, internal: 'child_lock', writable: true },
      9: { capability: null, internal: 'countdown', writable: true },
      17: { capability: 'measure_current', divisor: 1000 },
      18: { capability: 'measure_power', divisor: 10 },
      19: { capability: 'measure_voltage', divisor: 10 },
      20: { capability: 'meter_power', divisor: 100 },
      21: { capability: null, internal: 'frequency', divisor: 100 },
      101: { capability: null, internal: 'power_factor', divisor: 10 },
      102: { capability: null, internal: 'max_power_alert', writable: true }
    };
  }

  async onNodeInit({ zclNode }) {
    // Parent handles onoff listener - DO NOT re-register
    await super.onNodeInit({ zclNode });
    this.log('[PLUG] v5.5.129 - DPs: 1,7,9,17-21,101,102 | ZCL: 6,2820,1794,EF00');

    // Setup ZCL energy monitoring (parent doesn't do this)
    await this._setupEnergyMonitoring(zclNode);

    this.log('[PLUG] ✅ Ready');
  }

  async _setupEnergyMonitoring(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Electrical Measurement cluster (0x0B04)
    try {
      const elec = ep1.clusters?.haElectricalMeasurement;
      if (elec?.on) {
        elec.on('attr.activePower', (v) => this.setCapabilityValue('measure_power', v / 10).catch(() => { }));
        elec.on('attr.rmsVoltage', (v) => this.setCapabilityValue('measure_voltage', v / 10).catch(() => { }));
        elec.on('attr.rmsCurrent', (v) => this.setCapabilityValue('measure_current', v / 1000).catch(() => { }));
        this.log('[PLUG] ✅ ZCL Electrical Measurement configured');
      }
    } catch (e) { /* ignore */ }

    // Metering cluster (0x0702)
    try {
      const meter = ep1.clusters?.seMetering;
      if (meter?.on) {
        meter.on('attr.currentSummationDelivered', (v) => this.setCapabilityValue('meter_power', v / 1000).catch(() => { }));
        this.log('[PLUG] ✅ ZCL Metering configured');
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = SmartPlugDevice;
