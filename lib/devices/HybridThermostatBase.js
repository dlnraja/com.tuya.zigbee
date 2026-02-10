'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { ProductValueValidator } = require('../ProductValueValidator');
const { ensureManufacturerSettings } = require('../helpers/ManufacturerNameHelper');

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
      21: { capability: 'measure_battery', divisor: 1 }, // v5.8.69: TRV battery (Z2M confirmed)

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

    // v5.8.57: Ensure zb_manufacturer_name / zb_model_id settings populated
    await ensureManufacturerSettings(this).catch(() => {});

    const data = this.getData();
    if (data.subDeviceId !== undefined) {
      await this.setUnavailable('⚠️ Phantom device').catch(() => { });
      return;
    }

    // v5.6.0: Apply dynamic manufacturerName configuration
    await this._applyManufacturerConfig();

    // v5.6.2: Initialize intelligent value validator
    const driverType = this.driver?.id || 'thermostat';
    const productType = ProductValueValidator.detectProductType(driverType);
    this._valueValidator = ProductValueValidator.createDeviceValidator(this, productType);
    this.log(`[VALIDATOR] 🎯 Initialized for productType: ${productType}`);

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

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    // v5.5.916: Fixed manufacturer/model retrieval - use settings/store like other drivers
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    const data = this.getData() || {};
    
    const manufacturerName = settings.zb_manufacturer_name || 
                             store.manufacturerName || 
                             data.manufacturerName || 
                             'unknown';
    const productId = settings.zb_model_id || 
                      store.modelId || 
                      data.productId || 
                      'unknown';
    const driverType = this.driver?.id || 'unknown_thermostat';

    this.log(`[THERMOSTAT] 🔍 Config: ${manufacturerName} / ${productId} (${driverType})`);

    // v5.8.80: Apply registry profile if available
    const profile = this.getDeviceProfile?.() || this._deviceProfile;
    if (profile && profile.dpMappings) {
      this._dynamicDpMappings = { ...this.dpMappings, ...profile.dpMappings };
      this.log(`[THERMOSTAT] 📋 Registry profile: ${profile.id}`);
    }
    if (profile?.quirks) this._profileQuirks = profile.quirks;

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      driverType
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    // Override DP mappings if dynamic ones are provided
    if (config.dpMappings && Object.keys(config.dpMappings).length > 0) {
      this._dynamicDpMappings = config.dpMappings;
      this.log(`[THERMOSTAT] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[THERMOSTAT] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[THERMOSTAT] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[THERMOSTAT] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[THERMOSTAT] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  _detectProtocol() {
    const settings = this.getSettings?.() || {};
    const store = this.getStore?.() || {};
    // v5.6.0: FIX - Use correct settings keys (zb_model_id NOT zb_modelId)
    const modelId = settings.zb_model_id || settings.zb_modelId || store.modelId || '';
    const mfr = settings.zb_manufacturer_name || settings.zb_manufacturerName || store.manufacturerName || '';
    const isTuyaDP = modelId.toUpperCase() === 'TS0601' || mfr.toUpperCase().startsWith('_TZE');
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
        const temp = parseFloat(v) / 100;
        const prev = this.getCapabilityValue('measure_temperature');
        if (prev === temp) return;
        this.setCapabilityValue('measure_temperature', temp).catch(() => { });
      });
      thermostat.on('attr.occupiedHeatingSetpoint', (v) => {
        const target = v / 100;
        const prev = this.getCapabilityValue('target_temperature');
        if (prev === target) return;
        this.setCapabilityValue('target_temperature', target).catch(() => { });
      });
    }
  }

  _handleDP(dpId, raw) {
    const mapping = this.dpMappings[dpId];
    if (!mapping?.capability) return;

    let value = typeof raw === 'number' ? raw : Buffer.isBuffer(raw) ? raw.readIntBE(0, raw.length) : raw;
    if (mapping.divisor) value = value / mapping.divisor;
    if (mapping.transform) value = mapping.transform(value);

    // v5.6.2: Use intelligent validator for auto-correction
    if (value === null || value === undefined) return;

    if (this._valueValidator && mapping.capability) {
      const validation = this._valueValidator.validate(value, mapping.capability);

      if (!validation.isValid) {
        this.log(`[VALIDATOR] ❌ ${mapping.capability}: ${validation.message}`);
        return;
      }

      if (validation.correction) {
        this.log(`[VALIDATOR] 🔧 ${mapping.capability}: ${validation.message}`);
        value = validation.correctedValue;
      }
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
    // v5.8.70: Anti-flood — skip same-value updates
    const prev = this.getCapabilityValue(capability);
    if (prev === value) return;
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
