'use strict';
const { HybridThermostatBase } = require('../../lib/devices/HybridThermostatBase');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      RADIATOR VALVE (TRV) - v5.5.129 FIXED (extends HybridThermostatBase)   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  HybridThermostatBase handles: target_temperature listener                  ║
 * ║  This class: dpMappings + ZCL thermostat + onoff/mode listeners            ║
 * ║  DPs: 1-10,13-15,101-109 | ZCL: 513,1,1026,EF00                            ║
 * ║  Models: TS0601 TRV, _TZE200_*, MOES, SEA-ICON                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class RadiatorValveDevice extends HybridThermostatBase {

  get mainsPowered() { return false; }

  get dpMappings() {
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
      14: { capability: null, internal: 'battery_low', transform: (v) => v === 1 || v === true }, // SDK3: alarm_battery obsolète
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
    this.log('[TRV] v5.5.129 - DPs: 1-10,13-15,101-109 | ZCL: 513,1,1026,EF00');

    // Setup ZCL thermostat (parent doesn't do this)
    await this._setupThermostatCluster(zclNode);

    // Register onoff/mode listeners (parent only handles target_temperature)
    this._setupTRVListeners();

    this.log('[TRV] ✅ Ready');
  }

  async _setupThermostatCluster(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    try {
      const thermo = ep1.clusters?.hvacThermostat;
      if (thermo?.on) {
        thermo.on('attr.localTemperature', (v) => this.setCapabilityValue('measure_temperature', v / 100).catch(() => { }));
        thermo.on('attr.occupiedHeatingSetpoint', (v) => this.setCapabilityValue('target_temperature', v / 100).catch(() => { }));
        thermo.on('attr.pIHeatingDemand', (v) => {
          if (this.hasCapability('dim')) this.setCapabilityValue('dim', v / 100).catch(() => { });
        });
        this.log('[TRV] ✅ ZCL Thermostat configured');
      }
    } catch (e) { /* ignore */ }
  }

  _setupTRVListeners() {
    // On/Off - NOT handled by parent
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (v) => {
        await this._sendTuyaDP(1, v, 'bool');
      });
    }
    // Mode - NOT handled by parent
    if (this.hasCapability('thermostat_mode')) {
      this.registerCapabilityListener('thermostat_mode', async (v) => {
        await this._sendTuyaDP(2, { 'heat': 0, 'auto': 1, 'off': 2 }[v] ?? 0, 'enum');
      });
    }
  }

  async _sendTuyaDP(dp, value, type) {
    const tuya = this.zclNode?.endpoints?.[1]?.clusters?.tuya;
    if (tuya?.datapoint) await tuya.datapoint({ dp, value, type });
  }
}

module.exports = RadiatorValveDevice;
