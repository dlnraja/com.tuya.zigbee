'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║     HYBRID THERMOSTAT BASE - v5.5.130 ENRICHED (Zigbee2MQTT features)       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Base for thermostats, radiator valves, heaters                              ║
 * ║  Features: child_lock, window_detection, presets, calibration, schedules    ║
 * ║  Source: https://www.zigbee2mqtt.io/devices/TS0601_thermostat.html          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class HybridThermostatBase extends ZigBeeDevice {

  get mainsPowered() { return false; } // Most are battery
  get maxListeners() { return 50; }

  get thermostatCapabilities() {
    return ['target_temperature', 'measure_temperature', 'measure_battery'];
  }

  /**
   * v5.5.130: ENRICHED dpMappings from Zigbee2MQTT TS0601_thermostat documentation
   * https://www.zigbee2mqtt.io/devices/TS0601_thermostat.html
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════════════
      // CORE CLIMATE CONTROL
      // ═══════════════════════════════════════════════════════════════════════════
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true }, // System on/off
      2: { capability: 'target_temperature', divisor: 10 }, // Setpoint (°C * 10)
      3: { capability: 'measure_temperature', divisor: 10 }, // Local temp (°C * 10)
      16: { capability: 'target_temperature', divisor: 10 }, // Alternative setpoint
      24: { capability: 'measure_temperature', divisor: 10 }, // Alternative temp

      // ═══════════════════════════════════════════════════════════════════════════
      // BATTERY & POWER
      // ═══════════════════════════════════════════════════════════════════════════
      4: { capability: 'measure_battery', divisor: 1 }, // Battery %
      13: { capability: 'alarm_battery', transform: (v) => v === 1 || v === true }, // Battery low
      15: { capability: 'measure_battery', divisor: 1 }, // Alternative battery

      // ═══════════════════════════════════════════════════════════════════════════
      // SYSTEM MODE & PRESET
      // ═══════════════════════════════════════════════════════════════════════════
      // Mode: 0=schedule, 1=manual, 2=away, 3=boost (varies by device)
      4: { capability: null, internal: 'system_mode' },
      6: { capability: null, internal: 'preset' }, // schedule/manual/boost/comfort/eco/away

      // ═══════════════════════════════════════════════════════════════════════════
      // RUNNING STATE & VALVE
      // ═══════════════════════════════════════════════════════════════════════════
      // running_state: idle=0, heat=1
      5: { capability: null, internal: 'running_state' },
      // Valve position (0-100%)
      7: { capability: 'valve_position', divisor: 1 },
      36: { capability: 'valve_position', divisor: 1 }, // Alternative

      // ═══════════════════════════════════════════════════════════════════════════
      // CHILD LOCK & WINDOW DETECTION
      // ═══════════════════════════════════════════════════════════════════════════
      40: { capability: null, setting: 'child_lock' }, // LOCK/UNLOCK
      8: { capability: null, setting: 'window_detection' }, // ON/OFF
      14: { capability: 'alarm_contact', transform: (v) => v === 1 || v === true }, // window_open

      // ═══════════════════════════════════════════════════════════════════════════
      // CALIBRATION & LIMITS
      // ═══════════════════════════════════════════════════════════════════════════
      // local_temperature_calibration: -9 to +9 °C
      27: { capability: null, setting: 'temp_calibration', divisor: 10 },
      47: { capability: null, setting: 'temp_calibration', divisor: 10 }, // Alternative
      // Min/Max temp limits
      26: { capability: null, setting: 'max_temperature', divisor: 10 },
      28: { capability: null, setting: 'min_temperature', divisor: 10 },

      // ═══════════════════════════════════════════════════════════════════════════
      // COMFORT/ECO/AWAY TEMPERATURES
      // ═══════════════════════════════════════════════════════════════════════════
      21: { capability: null, setting: 'comfort_temperature', divisor: 10 },
      22: { capability: null, setting: 'eco_temperature', divisor: 10 },
      32: { capability: null, setting: 'away_preset_temperature', divisor: 10 },

      // ═══════════════════════════════════════════════════════════════════════════
      // BOOST & SCHEDULES
      // ═══════════════════════════════════════════════════════════════════════════
      9: { capability: null, setting: 'boost_time' }, // Seconds
      10: { capability: null, internal: 'valve_detection' }, // ON/OFF
      35: { capability: null, internal: 'away_preset_days' }, // 0-100
      65: { capability: null, internal: 'workdays_schedule' }, // Complex format
      66: { capability: null, internal: 'holidays_schedule' }, // Complex format
    };
  }

  async onNodeInit({ zclNode }) {
    if (this._hybridThermostatInited) return;
    this._hybridThermostatInited = true;

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    this.zclNode = zclNode;
    this._protocolInfo = this._detectProtocol();

    this.log(`[THERMOSTAT] Model: ${this._protocolInfo.modelId} | Mode: ${this._protocolInfo.protocol}`);

    await this._migrateCapabilities();
    this._bumpMaxListeners(zclNode);

    if (this._protocolInfo.isTuyaDP) {
      this._isPureTuyaDP = true;
      this._setupTuyaDPMode();
    } else {
      this._setupZCLMode(zclNode);
    }

    this._registerCapabilityListeners();
    this.log('[THERMOSTAT] ✅ Ready');
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const modelId = settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE');
    return { protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL', isTuyaDP, modelId, mfr };
  }

  async _migrateCapabilities() {
    for (const cap of this.thermostatCapabilities) {
      if (!this.hasCapability(cap)) {
        await this.addCapability(cap).catch(() => { });
      }
    }
  }

  _bumpMaxListeners(zclNode) {
    try {
      if (!zclNode?.endpoints) return;
      for (const ep of Object.values(zclNode.endpoints)) {
        if (typeof ep.setMaxListeners === 'function') ep.setMaxListeners(50);
        for (const c of Object.values(ep?.clusters || {})) {
          if (typeof c?.setMaxListeners === 'function') c.setMaxListeners(50);
        }
      }
    } catch (e) { }
  }

  _setupTuyaDPMode() {
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => this._handleDP(dpId, value));
    }
  }

  _setupZCLMode(zclNode) {
    const ep = zclNode?.endpoints?.[1];
    const thermostat = ep?.clusters?.thermostat || ep?.clusters?.hvacThermostat;
    if (thermostat) {
      thermostat.on('attr.localTemperature', (v) => {
        this.setCapabilityValue('measure_temperature', v / 100).catch(() => { });
      });
      thermostat.on('attr.occupiedHeatingSetpoint', (v) => {
        this.setCapabilityValue('target_temperature', v / 100).catch(() => { });
      });
    }
  }

  _handleDP(dpId, raw) {
    const mapping = this.dpMappings[dpId];
    if (!mapping?.capability) return;

    let value = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) ? raw.readIntBE(0, raw.length) : raw;
    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    // v5.5.107: Sanity checks for thermostat values
    if (value === null || value === undefined) return;
    if ((mapping.capability === 'measure_temperature' || mapping.capability === 'target_temperature')
      && (value < -40 || value > 80)) {
      this.log(`[DP] ⚠️ Temperature out of range: ${value}°C - IGNORED`);
      return;
    }
    if (mapping.capability === 'measure_humidity' && (value < 0 || value > 100)) {
      this.log(`[DP] ⚠️ Humidity out of range: ${value}% - IGNORED`);
      return;
    }

    // v5.5.118: Use safe setter with dynamic capability addition
    this._safeSetCapability(mapping.capability, value);
  }

  /**
   * v5.5.118: Capabilities that can be dynamically added for thermostats
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'target_temperature', 'measure_temperature', 'measure_humidity',
      'thermostat_mode'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic addition
   */
  async _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      if (HybridThermostatBase.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return;
        }
      } else {
        return;
      }
    }
    this.setCapabilityValue(capability, value).catch(() => { });
  }

  _registerCapabilityListeners() {
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        if (this._isPureTuyaDP && this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.sendDP(2, Math.round(value * 10), 'value');
        }
      });
    }
  }

  async registerCapability(cap, cluster, opts) {
    if (this._isPureTuyaDP) return;
    return super.registerCapability(cap, cluster, opts);
  }
}

module.exports = HybridThermostatBase;
