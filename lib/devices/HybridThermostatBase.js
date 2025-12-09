'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * HybridThermostatBase - Base for thermostats, radiator valves, heaters
 * v5.3.64
 */
class HybridThermostatBase extends ZigBeeDevice {

  get mainsPowered() { return false; } // Most are battery
  get maxListeners() { return 50; }

  get thermostatCapabilities() {
    return ['target_temperature', 'measure_temperature', 'measure_battery'];
  }

  get dpMappings() {
    return {
      2: { capability: 'target_temperature', divisor: 10 },
      3: { capability: 'measure_temperature', divisor: 10 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },
      16: { capability: 'target_temperature', divisor: 10 } // Some devices
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
