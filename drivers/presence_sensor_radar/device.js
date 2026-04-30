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

// Get sensor config by manufacturerName and optional modelId
// v7.4.11: HARDENED - Centralized dual-key resolution (Mfr + ModelId)
function getSensorConfig(manufacturerName, modelId = null) {
  const mfr = CI.normalize(manufacturerName);
  const model = CI.normalize(modelId || '');

  // 1. DUAL-KEY MATCH (Manufacturer + Model ID)
  if (CI.equalsCI(mfr, 'HOBEIAN') || CI.equalsCI(mfr, 'hobeian')) {
    if (CI.containsCI(model, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
    if (CI.containsCI(model, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    if (CI.containsCI(model, 'ZG-227Z') || CI.containsCI(model, 'ZG-227')) return { ...SENSOR_CONFIGS.HOBEIAN_10G_MULTI, configName: 'HOBEIAN_10G_MULTI' };
    if (CI.containsCI(model, 'ZG-204ZL')) return { ...SENSOR_CONFIGS.ZG_204ZL_PIR, configName: 'ZG_204ZL_PIR' };
    return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM_FALLBACK' };
  }

  // 2. EXACT MANUFACTURER MATCH
  const config = MANUFACTURER_CONFIG_MAP[mfr];
  if (config) return config;

  // 3. PATTERN MATCHING
  if (manufacturerName) {
    const knownVariants = ['iadro9bf', 'qasjif9e', 'ztqnh5cg', 'sbyx0lm6'];
    if (knownVariants.some(variant => CI.containsCI(manufacturerName, variant))) {
      return { ...SENSOR_CONFIGS.TZE284_IADRO9BF, configName: 'TZE284_IADRO9BF_PATTERN' };
    }
  }

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
    case 'motion_state_enum': result = value === 1 || value === 2 || value === 3; break;
    case 'presence_string': result = value === 'motion' || value === 'stationary' || value === 'presence'; break;
    default: result = !!value;
  }
  if (invertPresence) return !result;
  return result;
}

const presenceDebounceState = new Map();
function debouncePresence(presence, manufacturerName, deviceId) {
  if (!deviceId || !CI.containsCI(manufacturerName, 'gkfbdvyx')) return presence;
  const now = Date.now();
  const state = presenceDebounceState.get(deviceId) || { stablePresence: false, onCount: 0, offCount: 0, lastChangeTime: 0 };
  if (presence) { state.onCount++; state.offCount = 0; }
  else { state.offCount++; state.onCount = 0; }
  const requiredOnCount = 3;
  const requiredOffCount = 2;
  const minStateChangeInterval = 5000;
  const timeSinceLastChange = now - state.lastChangeTime;
  let newStablePresence = state.stablePresence;
  if (presence && state.onCount >= requiredOnCount && timeSinceLastChange >= minStateChangeInterval) {
    if (!state.stablePresence) { newStablePresence = true; state.lastChangeTime = now; }
  } else if (!presence && state.offCount >= requiredOffCount) {
    if (state.stablePresence) { newStablePresence = false; state.lastChangeTime = now; }
  }
  state.stablePresence = newStablePresence;
  presenceDebounceState.set(deviceId, state);
  return newStablePresence;
}

const luxSmoothingState = new Map();
function transformLux(rawValue, type, manufacturerName = '', deviceId = null) {
  let lux = typeof rawValue === 'number' ? rawValue : 0;
  if (lux > VALIDATION.LUX_ZYM100_MAX) lux = VALIDATION.LUX_ZYM100_MAX;
  if (deviceId) {
    if (!luxOscillationState.has(deviceId)) luxOscillationState.set(deviceId, { history: [], locked: false, lockedValue: null, lockTime: 0 });
    const oscState = luxOscillationState.get(deviceId);
    oscState.history.push({ value: lux, time: Date.now() });
    if (oscState.history.length > 5) oscState.history.shift();
    if (oscState.history.length >= 3) {
      const recent = oscState.history.slice(-3);
      if (recent.some(r => r.value < 100) && recent.some(r => r.value > 1500) && (recent[2].time - recent[0].time < 30000)) {
        if (!oscState.locked) { oscState.locked = true; oscState.lockedValue = recent.find(r => r.value < 100)?.value || 30; oscState.lockTime = Date.now(); }
      }
    }
    if (oscState.locked) {
      if (Date.now() - oscState.lockTime < TIMING.LUX_OSCILLATION_LOCK_MS) lux = oscState.lockedValue;
      else oscState.locked = false;
    }
  }
  if (lux === null || lux === undefined || isNaN(lux)) return 0;
  if (type === 'lux_div10') lux = safeMultiply(rawValue, 10);
  const isZYM100Series = CI.containsCI(manufacturerName, ['iadro9bf', 'gkfbdvyx', 'qasjif9e', 'sxm7l9xa']);
  const maxLux = isZYM100Series ? 2000 : 10000;
  if (lux > maxLux) lux = maxLux;
  return Math.max(0, Math.round(lux));
}

function transformDistance(value, divisor = 100, manufacturerName = '', deviceId = '') {
  if (typeof value !== 'number' || isNaN(value) || value < 0) return null;
  let distance = safeDivide(value, divisor);
  if (distance > VALIDATION.DISTANCE_MAX) distance = VALIDATION.DISTANCE_MAX;
  return Math.round(distance * 100) / 100;
}

class PresenceSensorRadarDevice extends UnifiedSensorBase {
  _getManufacturerName() { return getManufacturer(this); }
  _getSensorConfig() {
    const mfr = this._getManufacturerName();
    if (this._sensorConfig) {
      const cachedConfigName = this._sensorConfig.configName || 'DEFAULT';
      if ((cachedConfigName === 'DEFAULT' || cachedConfigName.endsWith('_FALLBACK')) && mfr) this._sensorConfig = null;
      else return this._sensorConfig;
    }
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
  get mainsPowered() { return !this._getSensorConfig().battery; }
  get sensorCapabilities() {
    const config = this._getSensorConfig();
    const caps = ['alarm_motion', 'alarm_human'];
    for (const dp of Object.values(config.dpMap || {})) { if (dp.cap && !caps.includes(dp.cap)) caps.push(dp.cap); }
    if (config.battery && !caps.includes('measure_battery')) caps.push('measure_battery');
    return caps;
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
          transform: (v) => debouncePresence(transformPresence(v, dpConfig.type, invertPresence, config.configName), mfr, this.getData()?.id),
          alsoSets: { 'alarm_human': (v) => debouncePresence(transformPresence(v, dpConfig.type, invertPresence, config.configName), mfr, this.getData()?.id) }
        };
      } else if (dpConfig.cap === 'measure_luminance') {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => transformLux(v, dpConfig.type || 'lux_direct', mfr, this.getData()?.id) };
      } else if (dpConfig.cap === 'measure_luminance.distance') {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => transformDistance(v, dpConfig.divisor || 100, mfr, this.getData()?.id) };
      } else if (dpConfig.cap) {
        mappings[dp] = { capability: dpConfig.cap, transform: (v) => safeDivide(v, dpConfig.divisor || 1) };
      } else if (dpConfig.setting) {
        mappings[dp] = { internal: dpConfig.setting, writable: true, divisor: dpConfig.divisor || 1 };
      }
    }
    return mappings;
  }
  async onNodeInit({ zclNode }) {
    this._registerCapabilityListeners();
    const config = this._getSensorConfig();
    if (config.useIntelligentInference) {
      this._presenceInference = new IntelligentPresenceInference(this);
      this._detectFirmwareVersion(zclNode);
    }
    if (config.battery) {
      await this._setupZclClusters(zclNode);
      this._setupPassiveListeners(zclNode);
      await this.setAvailable().catch(() => {});
      return;
    }
    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);
    await this._setupTuyaDPListeners(zclNode);
    if (config.needsPolling) this._startPresencePolling(zclNode);
    this.log('[RADAR] ✅ Radar presence sensor ready');
  }
  _handleTuyaResponse(data) {
    if (!data) return;
    this.setAvailable().catch(() => {});
    let dpId = data.dp || data.dpId || data.datapoint;
    const rawVal = this._parseBufferValue(data.value || data.data);
    if (this._intelGate && dpId !== undefined) this._intelGate.process(dpId, rawVal);
    const dpMap = this._getEffectiveDPMap();
    if (dpMap[dpId]?.cap === 'measure_luminance') {
      const finalLux = transformLux(rawVal, dpMap[dpId].type || 'lux_direct', this._getManufacturerName(), this.getData()?.id);
      this.setCapabilityValue('measure_luminance', finalLux).catch(() => {});
      if (dpMap[dpId].feedInference) this._feedLuxToInference(finalLux);
      return;
    }
    if (dpMap[dpId]?.cap === 'measure_temperature') {
      const temp = Math.round(safeDivide(rawVal, dpMap[dpId].divisor || 10) * 10) / 10;
      this.setCapabilityValue('measure_temperature', temp).catch(() => {});
      return;
    }
    if (dpMap[dpId]?.cap === 'measure_humidity') {
      const humidity = Math.round(safeDivide(rawVal, dpMap[dpId].divisor || 1, dpMap[dpId].multiplier || 1));
      this.setCapabilityValue('measure_humidity', Math.min(100, Math.max(0, humidity))).catch(() => {});
      return;
    }
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
    const cardId = detected ? 'presence_sensor_radar_presence_detected' : 'presence_sensor_radar_presence_cleared';
    try { await this.homey.flow.getTriggerCard(cardId).trigger(this, {}).catch(() => {}); } catch (e) {}
  }
  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;
    const power = ep1.clusters?.genPowerCfg || ep1.clusters?.powerConfiguration;
    if (power?.on) power.on('attr.batteryPercentageRemaining', (v) => this.setCapabilityValue('measure_battery', Math.round(v / 2)).catch(() => {}));
  }
  _setupPassiveListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
    if (tuya?.on) ['response', 'datapoint', 'data'].forEach(ev => tuya.on(ev, (d) => this._handleTuyaResponse(d)));
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
  _startPresencePolling(zclNode) {
    this._pollingInterval = setInterval(() => this._requestDPRefresh(zclNode), 30000);
  }
  async _requestDPRefresh(zclNode) {
    const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya || zclNode?.endpoints?.[1]?.clusters?.[CLUSTERS.TUYA_EF00];
    if (tuya?.dataQuery) await tuya.dataQuery().catch(() => {});
  }
}
module.exports = PresenceSensorRadarDevice;
