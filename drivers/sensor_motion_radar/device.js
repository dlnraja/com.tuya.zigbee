'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');
const { WakeStrategies } = require('../../lib/tuya/TuyaGatewayEmulator');

/**
 * Motion Sensor Radar Hybrid Device - v7.4.11
 * Supports multi-sensors with temperature, humidity, and battery reporting.
 */

const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');

// Build reverse lookup: manufacturerName -> config
const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

// v7.4.11: Standardized configuration resolution
function getSensorConfig(manufacturerName, modelId = null) {
  const mfr = CI.normalize(manufacturerName);
  const model = CI.normalize(modelId || '');

  // 1. DUAL-KEY MATCH
  if (CI.equalsCI(mfr, 'HOBEIAN') || CI.equalsCI(mfr, 'hobeian')) {
    if (CI.containsCI(model, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    if (CI.containsCI(model, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    if (CI.containsCI(model, 'ZG-227Z')) return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
    if (CI.containsCI(model, 'ZG-204ZL')) return { ...SENSOR_CONFIGS.ZG_204ZL_PIR, configName: 'ZG_204ZL_PIR' };
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  // 2. EXACT MATCH
  const config = MANUFACTURER_CONFIG_MAP[mfr];
  if (config) return config;

  // 3. PATTERN MATCH
  if (manufacturerName) {
    const knownVariants = ['iadro9bf', 'qasjif9e', 'ztqnh5cg', 'sbyx0lm6'];
    if (knownVariants.some(variant => CI.containsCI(manufacturerName, variant))) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF_PATTERN' };
    }
  }

  return SENSOR_CONFIGS.DEFAULT;
}

class MotionRadarHybridDevice extends UnifiedSensorBase {
  get mainsPowered() {
    const config = this._getSensorConfig();
    return config.mainsPowered === true || !config.battery;
  }

  static OFFLINE_CHECK_MS = 60 * 60 * 1000;

  _getSensorConfig() {
    if (!this._sensorConfig) {
      const mfr = getManufacturer(this);
      const model = getModelId(this);
      this._sensorConfig = getSensorConfig(mfr, model);
      this.log(`[RADAR-HYBRID] Config matched: ${this._sensorConfig.configName} for ${mfr} (${model})`);
    }
    return this._sensorConfig;
  }

  get sensorCapabilities() {
    const config = this._getSensorConfig();
    const caps = ['alarm_motion', 'alarm_human'];
    
    // Add capabilities from DP map
    for (const dp of Object.values(config.dpMap || {})) {
      if (dp.cap && !caps.includes(dp.cap)) caps.push(dp.cap);
    }
    
    if (config.battery && !caps.includes('measure_battery')) caps.push('measure_battery');
    
    return caps;
  }

  get dpMappings() {
    const config = this._getSensorConfig();
    const dpMap = config.dpMap || {};
    const mappings = {};
    
    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);
      if (dpConfig.cap) {
        mappings[dp] = {
          capability: dpConfig.cap,
          divisor: dpConfig.divisor || 1,
          transform: (v) => {
            if (dpConfig.multiplier) v = safeMultiply(v, dpConfig.multiplier);
            if (dpConfig.divisor) v = safeDivide(v, dpConfig.divisor);
            if (dpConfig.type === 'presence_bool') return v === 1 || v === true;
            if (dpConfig.type === 'presence_enum') return v === 1 || v === 2;
            return v;
          }
        };
        
        // Auto-set alarm_human for motion sensors
        if (dpConfig.cap === 'alarm_motion') {
          mappings[dp].alsoSets = { 'alarm_human': mappings[dp].transform };
        }
      } else if (dpConfig.internal) {
        mappings[dp] = { internal: dpConfig.internal, divisor: dpConfig.divisor || 1 };
      }
    }
    
    return mappings;
  }


  async onNodeInit({ zclNode }) {
    const config = this._getSensorConfig();
    
    // Attribute Reporting
    try {
      await this.configureAttributeReporting([
        { cluster: 'ssIasZone', attributeName: 'zoneStatus', minInterval: 0, maxInterval: 3600, minChange: 1 },
        { cluster: 'msIlluminanceMeasurement', attributeName: 'measuredValue', minInterval: 30, maxInterval: 600, minChange: 50 },
        { cluster: 'msTemperatureMeasurement', attributeName: 'measuredValue', minInterval: 30, maxInterval: 600, minChange: 50 },
        { cluster: 'msRelativeHumidity', attributeName: 'measuredValue', minInterval: 30, maxInterval: 600, minChange: 100 },
        { cluster: 'genPowerCfg', attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
      ]);
    } catch (err) {
      this.log('Attribute reporting config failed:', err.message);
    }

    // Capability Management
    if (this.hasCapability('alarm_contact')) {
      await this.removeCapability('alarm_contact').catch(() => { });
    }

    if (config.type === 'RELAY') {
      if (!this.hasCapability('onoff')) await this.addCapability('onoff').catch(() => {});
      for (const cap of ['measure_temperature', 'measure_humidity', 'alarm_human', 'measure_presence_time']) {
        if (this.hasCapability(cap)) await this.removeCapability(cap).catch(() => {});
      }
    }

    // Relay Control
    if (config.type === 'RELAY' && this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya;
        if (tuya?.datapoint) await tuya.datapoint({ dp: 108, value: value ? 1 : 0, type: 'enum' });
      });
    }

    await super.onNodeInit({ zclNode });

    // Illuminance Reporting
    try {
      const illum = zclNode.endpoints[1]?.clusters?.illuminanceMeasurement;
      if (illum) {
        await illum.configureReporting({
          measuredValue: { minInterval: 60, maxInterval: 900, minChange: 10 }
        }).catch(() => {});
      }
    } catch (e) { }

    this._registerCapabilityListeners();
    await this._setupOccupancyCluster(zclNode);
    await this._setupIASMotionListener(zclNode);
    this._lastEventTime = Date.now();
    this._setupOfflineCheck();
    await this._setupContinuousLuminanceReporting(zclNode);
    this._sendInitialDataQuery();
    this._setupWakeStrategies();

    this.log('[RADAR-HYBRID] Hybrid radar presence sensor ready');
  }

  async _setupContinuousLuminanceReporting(zclNode) {
    if (!this.hasCapability('measure_luminance')) return;
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const illumCluster = endpoint?.clusters?.illuminanceMeasurement || endpoint?.clusters?.msIlluminanceMeasurement;
      if (illumCluster) {
        await illumCluster.configureReporting({
          measuredValue: { minInterval: 30, maxInterval: 300, minChange: 50 }
        }).catch(() => {});
        illumCluster.on('attr.measuredValue', async (v) => {
          if (v !== null && v !== undefined && v >= 0) await this.setCapabilityValue('measure_luminance', parseFloat(v)).catch(() => {});
        });
      }
      this._setupPeriodicLuminanceQuery();
    } catch (e) {}
  }

  _setupPeriodicLuminanceQuery() {
    if (this._luminanceQueryTimer) clearInterval(this._luminanceQueryTimer);
    const interval = this.mainsPowered ? 60000 : 300000;
    this._luminanceQueryTimer = setInterval(async () => {
      if (this.safeTuyaDataQuery) await this.safeTuyaDataQuery([12, 103]).catch(() => {});
    }, interval);
  }

  async _setupWakeStrategies() {
    const config = this._getSensorConfig();
    const allDPs = config.dps || [1, 4, 12, 15];
    await WakeStrategies.onAnyDataReceived(this, allDPs, async (dps) => {
      if (this.safeTuyaDataQuery) await this.safeTuyaDataQuery(dps, { delayBetweenQueries: 50 });
    }).catch(() => {});
  }

  _setupOfflineCheck() {
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer);
    this._offlineCheckTimer = setInterval(() => {
      const elapsed = Date.now() - this._lastEventTime;
      if (elapsed > MotionRadarHybridDevice.OFFLINE_CHECK_MS) {
        this.setUnavailable('Pas de signal depuis 60+ minutes').catch(() => {});
      } else {
        this.setAvailable().catch(() => {});
      }
    }, 600000);
  }

  async _sendInitialDataQuery() {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this._sendTuyaDataQuery?.().catch(() => {});
  }

  _updateLastEventTime() {
    this._lastEventTime = Date.now();
    this.setAvailable().catch(() => {});
  }

  async _setupOccupancyCluster(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const occCluster = endpoint?.clusters?.occupancySensing || endpoint?.clusters?.msOccupancySensing;
      if (occCluster) {
        occCluster.on('attr.occupancy', (v) => {
          this._updateLastEventTime();
          if (this.hasCapability('alarm_motion')) this.setCapabilityValue('alarm_motion', v > 0).catch(() => {});
        });
      }
    } catch (e) {}
  }

  async _setupIASMotionListener(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;
      if (iasCluster) {
        iasCluster.onZoneStatusChangeNotification = (p) => {
          this._updateLastEventTime();
          const parsed = this._parseIASZoneStatus(p?.zoneStatus);
          if (this.hasCapability('alarm_motion')) this.setCapabilityValue('alarm_motion', parsed.alarm1 || parsed.alarm2).catch(() => {});
        };
      }
    } catch (e) {}
  }

  onTuyaStatus(status) {
    if (!status || status.dp === undefined) {
      super.onTuyaStatus(status);
      return;
    }
    this._updateLastEventTime();
    super.onTuyaStatus(status);
  }

  async onDeleted() {
    if (this._offlineCheckTimer) clearInterval(this._offlineCheckTimer);
    if (this._luminanceQueryTimer) clearInterval(this._luminanceQueryTimer);
    await super.onDeleted?.();
  }
}

module.exports = MotionRadarHybridDevice;
