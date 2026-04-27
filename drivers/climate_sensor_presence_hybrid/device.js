'use strict';

const CI = require('../../lib/utils/CaseInsensitiveMatcher');
const { getManufacturer, getModelId } = require('../../lib/helpers/DeviceDataHelper');
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { UnifiedSensorBase } = require('../../lib/devices/UnifiedSensorBase');

const SENSOR_CONFIGS = require('../../lib/data/SensorConfigs');
const IntelligentDPAutoDiscovery = require('../../lib/helpers/IntelligentDPAutoDiscovery');

const MANUFACTURER_CONFIG_MAP = {};
for (const [configName, config] of Object.entries(SENSOR_CONFIGS)) {
  for (const mfr of config.sensors) {
    MANUFACTURER_CONFIG_MAP[mfr.toLowerCase()] = { ...config, configName };
  }
}

function getSensorConfig(manufacturerName, modelId = null) {
  const mfrLower = CI.normalize(manufacturerName);
  if (CI.equalsCI(manufacturerName, 'HOBEIAN')) {
    const validModelId = modelId && !CI.equalsCI(modelId, 'null') && modelId.trim() !== '';
    if (validModelId) {
      if (CI.equalsCI(modelId, 'ZG-204ZM')) return { ...SENSOR_CONFIGS.HOBEIAN_ZG204ZM, configName: 'HOBEIAN_ZG204ZM' };
      if (CI.equalsCI(modelId, 'ZG-204ZV')) return { ...SENSOR_CONFIGS.ZG_204ZV_MULTISENSOR, configName: 'ZG_204ZV_MULTISENSOR' };
    }
  }
  const config = MANUFACTURER_CONFIG_MAP[mfrLower];
  if (config) return config;
  return SENSOR_CONFIGS.DEFAULT;
}

function transformPresence(value, type, invertPresence = false) {
  let result;
  if (value === null || value === undefined) return false;
  switch (type) {
    case 'presence_enum':
      result = value === 1 || value === 2;
      break;
    case 'presence_bool':
      result = value === 1 || value === true || value === 'presence';
      break;
    default:
      result = !!value;
  }
  return invertPresence ? !result : result;
}

class ClimateSensorPresenceDevice extends UnifiedSensorBase {

  _getManufacturerName() {
    return getManufacturer(this);
  }

  _getSensorConfig() {
    const mfr = this._getManufacturerName();
    if (this._sensorConfig) return this._sensorConfig;
    this._sensorConfig = getSensorConfig(mfr, getModelId(this));
    
    if (this._sensorConfig.configName === 'DEFAULT' && !this._dpAutoDiscovery) {
        this._dpAutoDiscovery = new IntelligentDPAutoDiscovery(this);
    }
    
    return this._sensorConfig;
  }

  _getEffectiveDPMap() {
    const config = this._getSensorConfig();
    if (this._dpAutoDiscovery && this._dpAutoDiscovery.isLearningComplete()) {
      const discoveredMap = this._dpAutoDiscovery.getDynamicDPMap();
      const mergedMap = { ...config.dpMap };
      for (const [dpId, dpConfig] of Object.entries(discoveredMap)) {
        if (!mergedMap[dpId]) mergedMap[dpId] = dpConfig;
      }
      return mergedMap;
    }
    return config.dpMap || {};
  }

  get dpMappings() {
    const config = this._getSensorConfig();
    const dpMap = config.dpMap || {};
    const mappings = {};
    const settings = this.getSettings() || {};
    const invertPresence = settings.invert_presence ?? config.invertPresence ?? false;

    for (const [dpId, dpConfig] of Object.entries(dpMap)) {
      const dp = parseInt(dpId);
      if (dpConfig.cap === 'alarm_motion' || dpConfig.cap === 'alarm_human') {
        mappings[dp] = {
          capability: 'alarm_motion',
          transform: (v) => transformPresence(v, dpConfig.type, invertPresence),
          alsoSets: {
            'alarm_human': (v) => transformPresence(v, dpConfig.type, invertPresence)
          }
        };
      } else if (dpConfig.cap) {
        mappings[dp] = {
          capability: dpConfig.cap,
          transform: (v) => safeDivide(v, dpConfig.divisor || 1)
        };
      }
    }
    return mappings;
  }

  async onNodeInit({ zclNode }) {
    this._registerCapabilityListeners();
    await super.onNodeInit({ zclNode });
    await this._setupZclClusters(zclNode);
    await this._setupTuyaDPListeners(zclNode);
    this.log('[CLIMATE-HYBRID-LEGACY] ✅ Climate presence sensor ready');
  }

  _handleTuyaResponse(data) {
    if (!data) return;
    let dpId = data.dp || data.dpId || data.datapoint;
    const rawVal = this._parseBufferValue(data.value || data.data);

    if (this._intelGate && dpId !== undefined) {
      this._intelGate.process(dpId, rawVal);
    }

    const dpMap = this._getEffectiveDPMap();
    const PRESENCE_DPS = [1, 104, 105, 112];

    if (PRESENCE_DPS.includes(dpId)) {
      const presenceValue = transformPresence(rawVal, dpMap[dpId]?.type, (this.getSettings().invert_presence ?? this._getSensorConfig().invertPresence ?? false));
      if (presenceValue !== null) {
        this._handlePresenceWithDebounce(presenceValue, dpId);
      }
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
    const prefix = 'climate_sensor_presence_hybrid_';
    const cardId = detected ? prefix + 'sensor_presence_radar_hybrid_presence_detected' : prefix + 'sensor_presence_radar_hybrid_presence_cleared';
    
    try {
      await this._getFlowCard(cardId).trigger(this, {}).catch(() => {});
    } catch (e) {}

    if (detected) {
      try {
        await this._getFlowCard(prefix + 'presence_sensor_radar_motion_detected_sensor_presence_radar_hybrid').trigger(this, {}).catch(() => {});
      } catch (e) {}
    }
  }

  async _setupZclClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const power = ep1.clusters?.genPowerCfg || ep1.clusters?.powerConfiguration;
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (v) => {
        this.setCapabilityValue('measure_battery', Math.round(v / 2)).catch(() => {});
      });
    }

    const temp = ep1.clusters?.msTemperatureMeasurement;
    if (temp?.on) {
      temp.on('attr.measuredValue', (v) => {
        this.setCapabilityValue('measure_temperature', safeDivide(v, 100)).catch(() => {});
      });
    }

    const hum = ep1.clusters?.msRelativeHumidity;
    if (hum?.on) {
      hum.on('attr.measuredValue', (v) => {
        this.setCapabilityValue('measure_humidity', safeDivide(v, 100)).catch(() => {});
      });
    }
  }

  _setupTuyaDPListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const tuya = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
    if (tuya?.on) {
      ['response', 'datapoint', 'dataReport'].forEach(ev => {
        tuya.on(ev, (d) => this._handleTuyaResponse(d));
      });
    }
  }

  _parseBufferValue(data) {
    if (typeof data === 'number') return data;
    if (Buffer.isBuffer(data)) return data.readUIntBE(0, data.length);
    if (data && typeof data === 'object' && data.type === 'Buffer') {
      return Buffer.from(data.data).readUIntBE(0, data.data.length);
    }
    return safeParse(data);
  }

}

module.exports = ClimateSensorPresenceDevice;
