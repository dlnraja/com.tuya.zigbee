'use strict';
const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

const VALIDATION = {
  BATTERY_MIN: 0,
  BATTERY_MAX: 100,
  LUX_MIN: 0,
  LUX_MAX: 10000,
  LUX_ZYM100_MAX: 2000,
  DISTANCE_MIN: 0,
  DISTANCE_MAX: 10,
};

const TIMING = {
  MOTION_THROTTLE_MS: 60000,
  LUX_OSCILLATION_LOCK_MS: 120000,
  LUX_SMOOTHING_RESET_MS: 120000,
  PRESENCE_POLLING_MS: 30000,
};

const luxOscillationState = new Map();
const IntelligentPresenceInference = require('../../lib/helpers/IntelligentPresenceInference');
const IntelligentDPAutoDiscovery = require('../../lib/helpers/IntelligentDPAutoDiscovery');
const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');

const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

function getSensorConfig(manufacturerName, modelId = null) {
  if (CI.equalsCI(manufacturerName, 'HOBEIAN')) {
    const validModelId = modelId && !CI.equalsCI(modelId, 'null') && modelId.trim() !== '';
    if (validModelId) {
      if (CI.equalsCI(modelId, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
      if (CI.equalsCI(modelId, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    }
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }
  const config = MANUFACTURER_CONFIG_MAP[CI.normalize(manufacturerName)];
  if (config) return config;
  return SENSOR_CONFIGS.DEFAULT;
}

function transformPresence(value, type, invertPresence = false, configName = '') {
  let result;
  if (value === null || value === undefined) return false;
  switch (type) {
    case 'presence_enum': result = value === 1 || value === 2; break;
    case 'presence_enum_gkfbdvyx':
      if (value === 0) result = false;
      else if (value === 1) result = true;
      else if (value === 2) return null;
      else result = false;
      break;
    case 'presence_bool': result = value === 1 || value === true || value === 'presence'; break;
    default: result = !!value;
  }
  if (invertPresence) return !result;
  return result;
}

class GasPresenceHybridDevice extends UnifiedSensorBase {
  _getManufacturerName() { return getManufacturer(this); }
  _getSensorConfig() {
    const mfr = this._getManufacturerName();
    if (this._sensorConfig) return this._sensorConfig;
    this._sensorConfig = getSensorConfig(mfr, getModelId(this));
    if (this._sensorConfig.configName === 'DEFAULT' && !this._dpAutoDiscovery) this._dpAutoDiscovery = new IntelligentDPAutoDiscovery(this);
    return this._sensorConfig;
  }
  _getEffectiveDPMap() {
    const config = this._getSensorConfig();
    if (this._dpAutoDiscovery && this._dpAutoDiscovery.isLearningComplete()) {
      const discoveredMap = this._dpAutoDiscovery.getDynamicDPMap();
      const mergedMap = { ...config.dpMap };
      for (const [dpId, dpConfig] of Object.entries(discoveredMap)) { if (!mergedMap[dpId]) mergedMap[dpId] = dpConfig; }
      return mergedMap;
    }
    return config.dpMap || {};
  }
  get dpMappings() {
    const config = this._getSensorConfig();
    const mfr = this._getManufacturerName();
    const dpMap = config.dpMap || {};
    const mappings = {};
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;
    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);
      if (dpConfig.cap === 'alarm_motion' || dpConfig.cap === 'alarm_human') {
        mappings[dp] = {
          capability: 'alarm_motion',
          transform: (v) => transformPresence(v, dpConfig.type, invertPresence, config.configName),
          alsoSets: { 'alarm_human': (v) => transformPresence(v, dpConfig.type, invertPresence, config.configName) }
        };
      } else if (dpConfig.cap === 'measure_luminance') {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => v };
      } else if (dpConfig.cap) {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => safeDivide(v, dpConfig.divisor || 1) };
      }
    }
    return mappings;
  }
  async onNodeInit({ zclNode }) {
    this._registerCapabilityListeners();
    const config = this._getSensorConfig();
    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);
    await this._setupTuyaDPListeners(zclNode);
    this.log('[GAS-HYBRID] ✅ Gas presence sensor ready');
  }
  _handleTuyaResponse(data) {
    if (!data) return;
    let dpId = data.dp || data.dpId || data.datapoint;
    const rawVal = this._parseBufferValue(data.value || data.data);
    if (this._intelGate && dpId !== undefined) this._intelGate.process(dpId, rawVal);
    const dpMap = this._getEffectiveDPMap();
    if (dpMap[dpId]?.cap === 'measure_battery') {
      this.setCapabilityValue('measure_battery', Math.round(safeDivide(rawVal, dpMap[dpId].divisor || 1))).catch(() => {});
      return;
    }
    const PRESENCE_DPS = [1, 104, 105, 112];
    if (PRESENCE_DPS.includes(dpId)) {
      const presenceValue = transformPresence(rawVal, dpMap[dpId]?.type, (this.getSettings().invert_presence ?? this._getSensorConfig().invertPresence ?? false));
      if (presenceValue !== null) this._handlePresenceWithDebounce(presenceValue, dpId);
    }
  }
  _handlePresenceWithDebounce(presence, dpId) {
    const current = this.getCapabilityValue('alarm_motion');
    if (presence === current) return;
    if (presence) {
      if (this._intelGate) this._intelGate.process('alarm_motion', true);
      this.setCapabilityValue('alarm_motion', true).catch(() => {});
      this._triggerPresenceFlows(true);
    } else {
      this.setCapabilityValue('alarm_motion', false).catch(() => {});
      this._triggerPresenceFlows(false);
    }
  }
  async _triggerPresenceFlows(detected) {
    const cardId = detected ? 'sensor_gas_presence_hybrid_presence_sensor_radar_presence_detected' : 'sensor_gas_presence_hybrid_presence_sensor_radar_presence_cleared';
    try { await this._getFlowCard(cardId).trigger(this, {}).catch(() => {}); } catch (e) {}
  }
  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    const power = ep1.clusters?.genPowerCfg || ep1.clusters?.powerConfiguration;
    if (power?.on) power.on('attr.batteryPercentageRemaining', (v) => this.setCapabilityValue('measure_battery', Math.round(v / 2)).catch(() => {}));
  }
  _setupTuyaDPListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
    if (tuya?.on) ['response', 'datapoint', 'dataReport'].forEach(ev => tuya.on(ev, (d) => this._handleTuyaResponse(d)));
  }
  _parseBufferValue(data) {
    if (typeof data === 'number') return data;
    if (Buffer.isBuffer(data)) return data.readUIntBE(0, data.length);
    if (data && typeof data === 'object' && data.type === 'Buffer') return Buffer.from(data.data).readUIntBE(0, data.data.length);
    return safeParse(data);
  }
}
module.exports = GasPresenceHybridDevice;
