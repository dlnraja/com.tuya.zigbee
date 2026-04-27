'use strict';

const { safeParse } = require('./utils/MathUtils.js');
const { CLUSTERS } = require('./constants/ZigbeeConstants.js');
const { includesCI, startsWithCI, equalsCI, containsCI } = require('./utils/CaseInsensitiveMatcher');
const CI = require('./utils/CaseInsensitiveMatcher');

/**
 * ManufacturerVariationManager - Gestion dynamique des variations par manufacturerName
 * v7.4.11 - FINAL STABILIZED VERSION
 * Resolves differences in ZCL clusters, Tuya DPs, and endpoints.
 */
class ManufacturerVariationManager {

  /**
   * v7.0.25: COMPOSITE LOOKUP TABLE (Rule 28)
   * Systematically maps (manufacturerName, productId) to specific configs.
   */
  static COMPOSITE_IDENTITY_MAP() {
    return {
      '_TZE200_beckyt8z': {
        'TS0601': 'curtain_motor_standard',
        'TS0602': 'plug_moes_standard',
      },
      '_TZE200_icka1clh': {
        'TS0601': 'moes_roller_blind',
      },
      '_TZE200_rhgsbacq': {
        'TS0601': 'radar_mmwave_mains',
      },
      '_TZE204_rhgsbacq': {
        'TS0601': 'radar_mmwave_mains',
      },
      '_TZ3002_pzao9ls1': {
        'TS0726': 'bseed_ts0726_4gang'
      },
      '_TZE284_oitavov2': {
        'TS0601': 'tuya_soil_sensor_standard'
      }
    };
  }

  /**
   * Detect protocol and configuration for a given manufacturerName and productId
   */
  static getManufacturerConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [],
      specialHandling: null
    };

    const compositeMap = this.COMPOSITE_IDENTITY_MAP();
    const mfrKey = Object.keys(compositeMap).find(key => equalsCI(key, manufacturerName));
    if (mfrKey) {
      const pidKey = Object.keys(compositeMap[mfrKey]).find(key => equalsCI(key, productId));
      if (pidKey) {
        const configKey = compositeMap[mfrKey][pidKey];
        const compositeConfig = this._getConfigByKey(configKey, manufacturerName, productId, driverType);
        if (compositeConfig) return compositeConfig;
      }
    }

    if (driverType === 'curtain_motor') return this._getCurtainMotorConfig(manufacturerName, productId);
    if (driverType === 'button_wireless') return this._getButtonConfig(manufacturerName, productId);
    if (driverType.startsWith('switch_')) return this._getSwitchConfig(manufacturerName, productId, driverType);
    if (driverType.includes('sensor')) return this._getSensorConfig(manufacturerName, productId, driverType);
    
    if (equalsCI(manufacturerName, '_TZE200_beckyt8z')) {
      if (equalsCI(productId, 'TS0601')) return this._getCurtainMotorConfig(manufacturerName, productId);
      if (equalsCI(productId, 'TS0602')) return this._getPlugConfig(manufacturerName, productId, 'plug');
    }

    if (driverType.includes('plug') || driverType.includes('outlet') || driverType.includes('socket')) {
      return this._getPlugConfig(manufacturerName, productId, driverType);
    }

    return config;
  }

  static _getCurtainMotorConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [], bindings: [] } },
      dpMappings: {},
      zclClusters: [],
      capabilities: ['windowcoverings_state', 'windowcoverings_set'],
      specialHandling: null
    };

    if (startsWithCI(manufacturerName, '_TZE200_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00];
      config.dpMappings = {
        1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
        2: { capability: 'windowcoverings_set', transform: (v) => safeParse(v, 100) },
        3: { capability: 'dim', transform: (v) => safeParse(v, 100) },
        101: { capability: null, internal: 'opening_mode' }
      };
      if (equalsCI(manufacturerName, '_TZE200_icka1clh')) {
        config.capabilities.push('windowcoverings_tilt_set');
        config.specialHandling = 'moes_roller_blind';
      }
    } else if (startsWithCI(manufacturerName, '_TZE204_')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00];
      config.specialHandling = 'tze204_curtain_position_inverted';
      config.dpMappings = {
        1: { capability: 'windowcoverings_state', transform: (v) => v === 0 ? 'up' : v === 2 ? 'down' : 'idle' },
        2: { capability: 'windowcoverings_set', transform: (v) => (100 - safeParse(v, 1)) },
        3: { capability: 'windowcoverings_set', transform: (v) => (100 - safeParse(v, 1)) }
      };
      config.invertedPosition = true;
    } else if (startsWithCI(manufacturerName, '_TZ3000_')) {
      config.protocol = 'mixed';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258, CLUSTERS.TUYA_EF00];
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258];
      config.dpMappings = {
        1: { capability: 'windowcoverings_state' },
        2: { capability: 'windowcoverings_set', transform: (v) => safeParse(v, 100) }
      };
    } else {
      config.protocol = 'zcl';
      config.endpoints[1].clusters = [0, 1, 6, 8, 258];
      config.endpoints[1].bindings = [6, 8, 258];
      config.zclClusters = [6, 8, 258];
    }
    return config;
  }

  static _getButtonConfig(manufacturerName, productId) {
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling: null,
      buttonLabels: null,
      noBatteryCluster: false,
      pressTypeMapping: { 0: 'single', 1: 'double', 2: 'long' },
      primaryCluster: 'scenes',
      sceneModeAttribute: null
    };

    const TS004F_SCENE_MODE_IDS = [
      '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_pcqjmcud',
      '_TZ3000_4fjiwweb', '_TZ3000_uri7oadn', '_TZ3000_ixla93vd',
      '_TZ3000_qzjcsmar', '_TZ3000_wkai4ga5', '_TZ3000_5tqxpine',
      '_TZ3000_abrsvsou', '_TZ3000_ja5osu5g', '_TZ3000_kjfzuycl',
      '_TZ3000_owgcnkrh', '_TZ3000_rrjr1dsk', '_TZ3000_vdfwjopk', 
      '_TZ3000_gwkzibhs'
    ];
    if (includesCI(TS004F_SCENE_MODE_IDS, manufacturerName) || equalsCI(productId, 'TS004F')) {
      config.protocol = 'zcl';
      config.primaryCluster = 'scenes';
      config.sceneModeAttribute = 0x8004;
      config.endpoints = {
        1: { clusters: [0, 1, 3, 4, 5, 6, 8, 18], bindings: [4, 5, 6] },
        2: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        3: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] },
        4: { clusters: [0, 3, 4, 5, 6, 18], bindings: [4, 5, 6] }
      };
      config.zclClusters = [4, 5, 6, 18];
      config.specialHandling = 'ts004f_scene_mode';
      return config;
    }

    if (startsWithCI(manufacturerName, '_TZE')) {
      config.protocol = 'tuya_dp';
      config.primaryCluster = 'tuya_dp';
      config.endpoints = { 1: { clusters: [0, CLUSTERS.TUYA_EF00], bindings: [] } };
      config.dpMappings = {
        1: { capability: null, internal: 'button_1_event' },
        2: { capability: null, internal: 'button_2_event' },
        3: { capability: null, internal: 'button_3_event' },
        4: { capability: null, internal: 'button_4_event' }
      };
      config.specialHandling = 'tuya_dp_button';
      return config;
    }

    if (startsWithCI(manufacturerName, '_TZ3000_')) {
      config.protocol = 'zcl';
      config.endpoints = { 1: { clusters: [0, 1, 3, 6, 1280], bindings: [1, 6, 1280] } };
      config.zclClusters = [6, 1280];
      if (CI.includesCI(['TS0042', 'TS0043', 'TS0044'], productId)) {
        const count = parseInt(productId.slice(-1));
        for (let i = 2; i <= count + 1; i++) {
          config.endpoints[i] = { clusters: [0, 3], bindings: [1] };
        }
      }
    }
    return config;
  }

  static _getSwitchConfig(manufacturerName, productId, driverType) {
    const gangCount = parseInt(driverType.match(/\d+/)?.[0]) || 1;
    const config = {
      protocol: 'mixed',
      endpoints: {},
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: [],
      specialHandling: null
    };

    for (let i = 1; i <= gangCount; i++) {
      config.capabilities.push(i === 1 ? 'onoff' : `onoff.gang${i}`);
    }

    if (startsWithCI(manufacturerName, '_TZE200_') || equalsCI(manufacturerName, '_TZ3000_cauq1okq')) {
      config.protocol = 'tuya_dp';
      config.endpoints = { 1: { clusters: [CLUSTERS.TUYA_EF00], bindings: [] } };
      for (let i = 1; i <= gangCount; i++) {
        config.dpMappings[i] = { capability: i === 1 ? 'onoff' : `onoff.gang${i}`, transform: (v) => Boolean(v) };
      }
    } else if (startsWithCI(manufacturerName, '_TZ3000_')) {
      config.protocol = 'zcl';
      config.endpoints[1] = { clusters: [0, 1, 6], bindings: [6] };
      config.zclClusters = [6];
      for (let i = 2; i <= gangCount; i++) {
        config.endpoints[i] = { clusters: [6], bindings: [6] };
      }
    } else if (startsWithCI(manufacturerName, '_TZ3002_')) {
      config.protocol = 'mixed';
      config.endpoints[1] = { clusters: [0, 4, 5, 6, 8, CLUSTERS.TUYA_EF00, 2820], bindings: [1, 6] };
      if (equalsCI(manufacturerName, '_TZ3002_pzao9ls1') && equalsCI(productId, 'TS0726')) {
        for (let i = 2; i <= 4; i++) {
          config.endpoints[i] = { clusters: [0, 3, 4, 5, 57344, 57345], bindings: [6] };
        }
        config.specialHandling = 'bseed_ts0726_4gang';
        config.powerSource = 'mains';
      }
      config.zclClusters = [6, 8, 2820];
    }
    return config;
  }

  static _getPlugConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1, 6, 2820, 1794, CLUSTERS.TUYA_EF00], bindings: [6] } },
      dpMappings: {},
      zclClusters: [6, 2820, 1794],
      capabilities: ['onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'],
      specialHandling: null,
      energyScaling: {
        power_divisor: 10,
        voltage_divisor: 10,
        current_divisor: 1000,
        energy_divisor: 100,
        energy_multiplier: 1
      }
    };

    const LIDL_IDS = ['_TZ3000_ynmowqk2', '_TZ3000_kdi2o9m6', '_TZ3000_g5xawfcq'];
    if (includesCI(LIDL_IDS, manufacturerName)) {
      config.energyScaling.energy_multiplier = 0.001;
      config.specialHandling = 'lidl_silvercrest_energy_wh';
    }

    const MOES_BSEED_IDS = ['_TZ3000_cehuw1lw', '_TZ3000_5f43h46b', '_TZ3000_yujkchbz'];
    if (includesCI(MOES_BSEED_IDS, manufacturerName)) {
      config.protocol = 'tuya_dp';
      config.dpMappings = {
        1: { capability: 'onoff', transform: (v) => Boolean(v) },
        17: { capability: 'measure_current', divisor: 1000 },
        18: { capability: 'measure_power', divisor: 10 },
        19: { capability: 'measure_voltage', divisor: 10 },
        20: { capability: 'meter_power', divisor: 100 }
      };
      config.specialHandling = 'moes_tuya_dp_energy';
    }
    return config;
  }

  static _getSensorConfig(manufacturerName, productId, driverType) {
    const config = {
      protocol: 'mixed',
      endpoints: { 1: { clusters: [0, 1], bindings: [1] } },
      bindings: {},
      dpMappings: {},
      zclClusters: [],
      capabilities: ['measure_battery'],
      specialHandling: null
    };

    if (driverType.includes('temperature') || driverType.includes('climate')) {
      config.capabilities.push('measure_temperature', 'measure_humidity');
      config.endpoints[1].clusters.push(1026, 1029);
      config.zclClusters = [1026, 1029];
    }

    if (driverType.includes('motion')) {
      config.capabilities.push('alarm_motion');
      config.endpoints[1].clusters.push(1280);
      config.zclClusters.push(1280);
    }

    if (startsWithCI(manufacturerName, '_TZE')) {
      config.protocol = 'tuya_dp';
      config.endpoints[1].clusters = [CLUSTERS.TUYA_EF00];
      config.dpMappings = {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity', divisor: 1 },
        3: { capability: 'measure_battery', divisor: 1 }
      };
      if (equalsCI(manufacturerName, '_TZE200_crq3r3la')) {
        config.powerSource = 'mains';
        config.capabilities = ['alarm_motion', 'measure_luminance.distance'];
        config.dpMappings = {
          1: { capability: 'alarm_motion', transform: (v) => Boolean(v) },
          9: { capability: 'measure_luminance.distance', divisor: 100 },
          101: { capability: null, internal: 'sensitivity' },
          102: { capability: null, internal: 'detection_delay' }
        };
        config.specialHandling = 'mmwave_presence_mains';
      }
    }
    return config;
  }

  static applyManufacturerConfig(device, config) {
    device._manufacturerConfig = config;
    device._isPureTuyaDP = config.protocol === 'tuya_dp';
    device._usesZCL = config.protocol === 'zcl' || config.protocol === 'mixed';
    if (config.dpMappings) device._dynamicDpMappings = config.dpMappings;
    if (config.zclClusters) device._supportedZclClusters = config.zclClusters;
    if (config.specialHandling) device._specialHandling = config.specialHandling;
    return config;
  }

  static _getConfigByKey(key, mfr, pid, type) {
    if (key === 'curtain_motor_standard') return this._getCurtainMotorConfig(mfr, pid);
    if (key === 'moes_roller_blind') {
      const c = this._getCurtainMotorConfig(mfr, pid);
      if (!c.capabilities.includes('windowcoverings_tilt_set')) c.capabilities.push('windowcoverings_tilt_set');
      c.specialHandling = 'moes_roller_blind';
      return c;
    }
    if (key === 'radar_mmwave_mains') {
      const c = this._getSensorConfig(mfr, pid, 'motion_sensor');
      c.powerSource = 'mains';
      c.capabilities = ['alarm_motion', 'measure_luminance.distance'];
      c.dpMappings = {
        1: { capability: 'alarm_motion', transform: (v) => Boolean(v) },
        9: { capability: 'measure_luminance.distance', divisor: 100 },
        101: { capability: null, internal: 'sensitivity' },
        102: { capability: null, internal: 'detection_delay' }
      };
      return c;
    }
    if (key === 'plug_moes_standard') return this._getPlugConfig(mfr, pid, 'plug');
    if (key === 'bseed_ts0726_4gang') return this._getSwitchConfig(mfr, pid, 'switch_4gang');
    if (key === 'tuya_soil_sensor_standard') {
      const c = this._getSensorConfig(mfr, pid, 'soil_sensor');
      c.dpMappings = {
        1: { capability: 'measure_temperature', divisor: 10 },
        2: { capability: 'measure_humidity', divisor: 1 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'measure_humidity', divisor: 1 },
        15: { capability: 'measure_battery', divisor: 1 }
      };
      return c;
    }
    return null;
  }

  static resolveDriverType(manufacturerName, productId) {
    if (!productId) return null;
    const map = {
      'TS0001': 'switch_1gang', 'TS0002': 'switch_2gang',
      'TS0003': 'switch_3gang', 'TS0004': 'switch_4gang',
      'TS0011': 'switch_1gang', 'TS0012': 'switch_2gang',
      'TS0013': 'switch_3gang', 'TS0014': 'switch_4gang',
      'TS0041': 'button_wireless_1', 'TS0042': 'button_wireless_2',
      'TS0043': 'button_wireless_3', 'TS0044': 'button_wireless_4',
      'TS004F': 'button_wireless_4',
      'TS011F': 'plug_energy_monitor', 'TS0121': 'plug_energy_monitor',
      'TS0101': 'plug', 'TS0201': 'temp_humidity_sensor',
      'TS0202': 'motion_sensor', 'TS0203': 'contact_sensor',
      'TS1201': 'ir_remote',
    };
    for (const [key, value] of Object.entries(map)) {
      if (CI.equalsCI(key, productId)) return value;
    }
    return null;
  }

  static needsSpecialConfig(manufacturerName, productId, driverType) {
    const specialPatterns = ['_TZE200_', '_TZE204_', '_TZE284_', '_TZ3000_', '_TZ3210_', '_TZ3400_', 'Benexmart', 'Dooya', 'MOES'];
    return specialPatterns.some(pattern => containsCI(manufacturerName, pattern));
  }
}

module.exports = ManufacturerVariationManager;
