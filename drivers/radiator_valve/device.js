'use strict';
const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADIATOR VALVE (TRV) - v5.5.787 FIXED (extends HybridThermostatBase)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridThermostatBase handles: target_temperature listener                  ║
 * ║  This class: dpMappings + ZCL thermostat + onoff/mode listeners            ║
 * ║  Profile A (Standard): DPs 1-10,13-15,101-109 - MOES, SEA-ICON             ║
 * ║  Profile B (ME167): DPs 2-5,7,35,36,39,47 - AVATTO ME167/TRV06             ║
 * ║  Auto-detection based on manufacturerName prefix                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class RadiatorValveDevice extends HybridThermostatBase {

  get mainsPowered() { return false; }

  /**
   * Detect DP profile based on manufacturerName
   * Profile B (ME167): _TZE284_o3x45p96, _TZE284_p3dbf6qs, _TZE200_p3dbf6qs, etc.
   */
  get dpProfile() {
    const mfr = this.getSetting('zb_manufacturer_name') || this.getStoreValue('manufacturerName') || '';
    const me167Ids = [
      '_TZE284_o3x45p96', '_tze284_o3x45p96',
      '_TZE284_p3dbf6qs', '_tze284_p3dbf6qs',
      '_TZE200_p3dbf6qs', '_tze200_p3dbf6qs',
      '_TZE284_rv6iuyxb', '_tze284_rv6iuyxb',
      '_TZE284_c6wv4xyo', '_tze284_c6wv4xyo',
      '_TZE284_hvaxb2tc', '_tze284_hvaxb2tc',
      '_TZE204_o3x45p96', '_tze204_o3x45p96'
    ];
    return me167Ids.some(id => mfr.toLowerCase().includes(id.toLowerCase())) ? 'me167' : 'standard';
  }

  get dpMappings() {
    if (this.dpProfile === 'me167') {
      // Profile B: AVATTO ME167/TRV06 DP mapping
      // v5.5.921: FORUM FIX (ManuelKugler #1223) - Added alarm_battery for DP35
      return {
        2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'auto', 1: 'heat', 2: 'off' }[v] ?? 'heat') },
        3: { capability: null, internal: 'running_state', transform: (v) => v === 0 ? 'heat' : 'idle' },
        4: { capability: 'target_temperature', divisor: 10 },
        5: { capability: 'measure_temperature', divisor: 10 },
        7: { capability: null, internal: 'child_lock', writable: true },
        35: { capability: 'alarm_battery', transform: (v) => v === 1 },
        36: { capability: null, internal: 'frost_protection', writable: true },
        39: { capability: null, internal: 'anti_scaling', writable: true },
        47: { capability: null, internal: 'temp_calibration', writable: true }
      };
    }
    // Profile A: Standard TRV DP mapping (MOES, etc.)
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true || v === 'on' },
      2: { capability: 'thermostat_mode', transform: (v) => ({ 0: 'heat', 1: 'auto', 2: 'off' }[v] ?? 'heat') },
      3: { capability: 'target_temperature', divisor: 10 },
      4: { capability: 'measure_temperature', divisor: 10 },
      7: { capability: null, internal: 'child_lock', writable: true },
      8: { capability: null, internal: 'frost_protection', writable: true },
      9: { capability: null, internal: 'eco_temp', divisor: 10, writable: true },
      10: { capability: null, internal: 'comfort_temp', divisor: 10, writable: true },
      13: { capability: 'measure_battery', divisor: 1 },
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === true },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'alarm_contact', transform: (v) => v === 1 || v === true },
      102: { capability: 'dim', divisor: 100 },
      103: { capability: null, internal: 'boost_mode', writable: true },
      104: { capability: null, internal: 'temp_offset', divisor: 10, writable: true },
      105: { capability: null, internal: 'min_temp', divisor: 10, writable: true },
      106: { capability: null, internal: 'max_temp', divisor: 10, writable: true },
      107: { capability: null, internal: 'away_mode', writable: true },
      108: { capability: null, internal: 'away_temp', divisor: 10, writable: true },
      109: { capability: 'alarm_generic', transform: (v) => v === 1 || v === true }
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    const profile = this.dpProfile;
    this.log(`[TRV] v5.5.788 - Profile: ${profile} | ${profile === 'me167' ? 'ME167 DPs: 2-5,7,35,36,39,47' : 'Standard DPs: 1-10,13-15,101-109'}`);

    // Store manufacturerName for profile detection
    try {
      const mfr = this.getStoreValue('manufacturerName') || zclNode?.endpoints?.[1]?.clusters?.basic?.attributes?.manufacturerName?.value;
      if (mfr) this.setStoreValue('manufacturerName', mfr).catch(() => {});
    } catch (e) { /* ignore */ }

    // Setup ZCL thermostat (parent doesn't do this)
    await this._setupThermostatCluster(zclNode);

    // Register onoff/mode listeners (parent only handles target_temperature)
    this._setupTRVListeners();

    this.log(`[TRV] ✅ Ready (${profile} profile)`);
  }

  async _setupThermostatCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    try {
      const thermo = ep1.clusters?.hvacThermostat;
      if (thermo?.on) {
        thermo.on('attr.localTemperature', (v) => this.setCapabilityValue('measure_temperature', parseFloat(v) / 100).catch(() => { }));
        thermo.on('attr.occupiedHeatingSetpoint', (v) => this.setCapabilityValue('target_temperature', v / 100).catch(() => { }));
        thermo.on('attr.pIHeatingDemand', (v) => {
          if (this.hasCapability('dim')) this.setCapabilityValue('dim', v / 100).catch(() => { });
        });
        this.log('[TRV] ✅ ZCL Thermostat configured');
      }
    } catch (e) { /* ignore */ }
  }

  _setupTRVListeners() {
    const profile = this.dpProfile;

    // On/Off - NOT handled by parent (standard profile only)
    if (this.hasCapability('onoff') && profile === 'standard') {
      this.registerCapabilityListener('onoff', async (v) => {
        await this._sendTuyaDP(1, v, 'bool');
      });
    }

    // Mode - different mapping per profile
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        if (profile === 'me167') {
          // ME167: 0=auto, 1=heat, 2=off
          await this._sendTuyaDP(2, { 'auto': 0, 'heat': 1, 'off': 2 }[v] ?? 1, 'enum');
        } else {
          // Standard: 0=heat, 1=auto, 2=off
          await this._sendTuyaDP(2, { 'heat': 0, 'auto': 1, 'off': 2 }[v] ?? 0, 'enum');
        }
      });
    }

    // Target temperature - different DP per profile
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (v) => {
        const dp = profile === 'me167' ? 4 : 3;
        await this._sendTuyaDP(dp, Math.round(v * 10), 'value');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) {
      this.log(`[TRV] Sending DP${dp} = ${value} (${type})`);
      await tuya.datapoint({ dp, value, type });
    }
  }
}

module.exports = RadiatorValveDevice;
