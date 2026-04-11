/**
 * TUYA UNIVERSAL MAPPING SYSTEM
 *
 * Système ultra-complet de mapping entre:
 * - Tuya DataPoints (DPs)
 * - Zigbee Clusters (standard + manufacturer-specific)
 * - Homey Capabilities (standard + custom)
 *
 * Sources consolidées:
 * - Zigbee2MQTT: https://github.com/Koenkk/zigbee2mqtt
 * - Home Assistant ZHA: https://github.com/zigpy/zha-device-handlers
 * - Blakadder Database: https://zigbee.blakadder.com
 * - Johan Bendz GitHub: https://github.com/JohanBendz/com.tuya.zigbee
 * - dlnraja forks & PRs
 * - Tuya IoT Platform: https://developer.tuya.com
 * - Homey Community Forum
 *
 * Version: 2.0.0
 * Date: 2025-10-28
 * Auteur: Dylan Rajasekaram
 */

'use strict';

const ClusterMap = require('./zigbee-cluster-map');

/**
 * UNIVERSAL DATAPOINT REGISTRY
 * Consolidation de TOUTES les sources connues
 */
const DATAPOINT_REGISTRY = {

  // ========== COMMON DATAPOINTS (tous types de devices) ==========
  COMMON: {
    1: {
      name: 'onoff',
      capability: 'onoff',
      type: 'bool',
      writable: true,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha', 'blakadder'],
      devices: ['switch', 'plug', 'light', 'siren', 'valve']
    },
    2: {
      name: 'battery_percentage',
      capability: 'measure_battery',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'raw',
      unit: '%',
      sources: ['z2m', 'zha', 'johan'],
      devices: ['sensor', 'button', 'remote', 'lock']
    },
    3: {
      name: 'brightness',
      capability: 'dim',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'scale',
      scale: { from: [0, 1000], to: [0, 1] },
      sources: ['z2m', 'zha'],
      devices: ['light', 'dimmer']
    },
    4: {
      name: 'temperature',
      capability: 'measure_temperature',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy10',
      unit: '°C',
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['climate', 'thermostat', 'sensor']
    },
    5: {
      name: 'humidity',
      capability: 'measure_humidity',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'raw',
      unit: '%',
      sources: ['z2m', 'zha', 'blakadder'],
      devices: ['climate', 'sensor']
    },
    9: {
      name: 'illuminance_lux',
      capability: 'measure_luminance',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'raw',
      unit: 'lux',
      sources: ['z2m', 'johan'],
      devices: ['motion_sensor', 'illuminance_sensor']
    },
    13: {
      name: 'child_lock',
      capability: 'locked',
      type: 'bool',
      writable: true,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha'],
      devices: ['switch', 'thermostat', 'valve']
    },
    14: {
      name: 'battery_low',
      capability: 'alarm_battery',
      type: 'bool',
      writable: false,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha', 'johan'],
      devices: ['sensor', 'button', 'remote']
    },
    15: {
      name: 'battery_state',
      capability: 'measure_battery',
      type: 'enum',
      writable: false,
      reportable: true,
      converter: 'enum',
      mapping: { 0: 'low', 1: 'medium', 2: 'high' },
      sources: ['z2m'],
      devices: ['smoke_detector', 'gas_detector']
    }
  },

  // ========== ENERGY MONITORING (Smart Plugs) ==========
  ENERGY: {
    16: {
      name: 'energy_total',
      capability: 'meter_power',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy100',
      unit: 'kWh',
      sources: ['z2m', 'blakadder', 'johan'],
      devices: ['plug', 'switch'],
      notes: 'Total cumulative energy in kWh'
    },
    17: {
      name: 'energy_consumed',
      capability: 'meter_power',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy100',
      unit: 'kWh',
      sources: ['z2m', 'zha'],
      devices: ['plug', 'switch']
    },
    18: {
      name: 'current',
      capability: 'measure_current',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy1000',
      unit: 'A',
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['plug', 'switch']
    },
    19: {
      name: 'power',
      capability: 'measure_power',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy10',
      unit: 'W',
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['plug', 'switch']
    },
    20: {
      name: 'voltage',
      capability: 'measure_voltage',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy10',
      unit: 'V',
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['plug', 'switch']
    }
  },

  // ========== CLIMATE & THERMOSTAT ==========
  CLIMATE: {
    2: {
      name: 'target_temperature',
      capability: 'target_temperature',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'divideBy10',
      unit: '°C',
      min: 50,
      max: 300,
      sources: ['z2m', 'zha', 'blakadder'],
      devices: ['thermostat', 'trv']
    },
    3: {
      name: 'current_temperature',
      capability: 'measure_temperature',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'divideBy10',
      unit: '°C',
      sources: ['z2m', 'zha'],
      devices: ['thermostat', 'trv']
    },
    4: {
      name: 'mode',
      capability: 'thermostat_mode',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'off',
        1: 'heat',
        2: 'cool',
        3: 'auto',
        4: 'dry',
        5: 'fan_only'
      },
      sources: ['z2m', 'zha', 'blakadder'],
      devices: ['thermostat', 'climate']
    },
    5: {
      name: 'fan_mode',
      capability: 'fan_mode',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'auto',
        1: 'low',
        2: 'medium',
        3: 'high'
      },
      sources: ['z2m', 'zha'],
      devices: ['thermostat', 'climate', 'fan']
    }
  },

  // ========== LIGHTING (RGB/CCT) ==========
  LIGHTING: {
    3: {
      name: 'work_mode',
      capability: 'light_mode',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'white',
        1: 'color',
        2: 'scene',
        3: 'music'
      },
      sources: ['z2m', 'zha'],
      devices: ['light', 'led_strip']
    },
    4: {
      name: 'color_temp',
      capability: 'light_temperature',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'scale',
      scale: { from: [0, 1000], to: [0, 1] },
      sources: ['z2m', 'zha'],
      devices: ['light']
    },
    5: {
      name: 'color_data_hsv',
      capability: ['light_hue', 'light_saturation'],
      type: 'hex',
      writable: true,
      reportable: true,
      converter: 'hsv',
      sources: ['z2m', 'zha', 'blakadder'],
      devices: ['light', 'led_strip'],
      notes: 'Encoded as HHHHSSSSVVVV hex string'
    },
    24: {
      name: 'color_hsb',
      capability: ['light_hue', 'light_saturation', 'dim'],
      type: 'string',
      writable: true,
      reportable: true,
      converter: 'hsb_string',
      sources: ['z2m'],
      devices: ['light'],
      notes: 'Format: "HHHSSSSBBB" (H=hue 0-360, S=sat 0-100, B=bright 0-100)'
    }
  },

  // ========== WINDOW COVERING (Curtains/Blinds) ==========
  COVERING: {
    1: {
      name: 'control',
      capability: 'windowcoverings_state',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'stop',
        1: 'open',
        2: 'close'
      },
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['curtain', 'blind', 'shade']
    },
    2: {
      name: 'position',
      capability: 'windowcoverings_set',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'scale',
      scale: { from: [0, 100], to: [0, 1] },
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['curtain', 'blind', 'shade'],
      notes: '0=closed, 100=open'
    },
    3: {
      name: 'position_inverted',
      capability: 'windowcoverings_set',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'invert_scale',
      scale: { from: [0, 100], to: [1, 0] },
      sources: ['z2m'],
      devices: ['curtain'],
      notes: '100=closed, 0=open (inverted)'
    }
  },

  // ========== SENSORS (Motion/Contact/Smoke/Gas/Water) ==========
  // Note: DP1 has different meanings for different sensor types
  SENSORS: {
    1: {
      name: 'sensor_alarm',
      alternates: [
        { name: 'occupancy', capability: 'alarm_motion', devices: ['motion_sensor', 'presence_sensor'] },
        { name: 'contact', capability: 'alarm_contact', converter: 'boolean_inverted', devices: ['contact_sensor', 'door_sensor', 'window_sensor'], notes: 'true=open, false=closed' },
        { name: 'smoke', capability: 'alarm_smoke', devices: ['smoke_detector'] },
        { name: 'gas', capability: 'alarm_co', devices: ['gas_detector', 'co_detector'] }
      ],
      type: 'bool',
      writable: false,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha', 'blakadder', 'johan']
    },
    15: {
      name: 'water_leak',
      capability: 'alarm_water',
      type: 'bool',
      writable: false,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['water_leak_detector']
    },
    101: {
      name: 'occupancy_timeout',
      capability: 'motion_timeout',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'raw',
      unit: 's',
      sources: ['z2m', 'johan'],
      devices: ['motion_sensor']
    },
    102: {
      name: 'sensitivity',
      capability: 'sensitivity',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'low',
        1: 'medium',
        2: 'high'
      },
      sources: ['z2m', 'johan'],
      devices: ['motion_sensor', 'presence_sensor']
    }
  },

  // ========== BUTTONS & REMOTES ==========
  BUTTONS: {
    1: {
      name: 'action',
      capability: 'button',
      type: 'enum',
      writable: false,
      reportable: true,
      converter: 'button_action',
      mapping: {
        0: 'single',
        1: 'double',
        2: 'hold'
      },
      sources: ['z2m', 'zha', 'blakadder', 'johan'],
      devices: ['button', 'remote', 'scene_switch']
    },
    2: {
      name: 'mode',
      capability: 'button_mode',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'command',
        1: 'event'
      },
      sources: ['z2m'],
      devices: ['button', 'scene_switch']
    }
  },

  // ========== LOCK & VALVE ==========
  LOCK_VALVE: {
    1: {
      name: 'state',
      capability: 'locked',
      type: 'bool',
      writable: true,
      reportable: true,
      converter: 'boolean',
      sources: ['z2m', 'zha'],
      devices: ['lock', 'valve']
    },
    11: {
      name: 'battery',
      capability: 'measure_battery',
      type: 'value',
      writable: false,
      reportable: true,
      converter: 'raw',
      unit: '%',
      sources: ['z2m'],
      devices: ['lock']
    }
  },

  // ========== SIRENS & ALARMS ==========
  SIREN: {
    5: {
      name: 'volume',
      capability: 'volume_set',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'low',
        1: 'medium',
        2: 'high'
      },
      sources: ['z2m', 'johan'],
      devices: ['siren', 'alarm']
    },
    7: {
      name: 'duration',
      capability: 'alarm_duration',
      type: 'value',
      writable: true,
      reportable: true,
      converter: 'raw',
      unit: 's',
      sources: ['z2m'],
      devices: ['siren', 'alarm']
    },
    13: {
      name: 'alarm_mode',
      capability: 'alarm_mode',
      type: 'enum',
      writable: true,
      reportable: true,
      converter: 'enum',
      mapping: {
        0: 'alarm',
        1: 'doorbell',
        2: 'silent'
      },
      sources: ['z2m'],
      devices: ['siren']
    }
  }
};

/**
 * ZIGBEE CLUSTER TO CAPABILITY MAPPING
 * Maps standard Zigbee clusters to Homey capabilities
 */
const CLUSTER_CAPABILITY_MAP = {
  // On/Off (0x0006)
  6: {
    capability: 'onoff',
    attribute: 'onOff',
    type: 'bool',
    writable: true,
    commandListener: true, // Pour buttons
    sources: ['zigbee-spec', 'johan', 'z2m']
  },

  // Level Control (0x0008)
  8: {
    capability: 'dim',
    attribute: 'currentLevel',
    type: 'value',
    writable: true,
    scale: { from: [0, 254], to: [0, 1] },
    sources: ['zigbee-spec', 'johan']
  },

  // Window Covering (0x0102)
  258: {
    capability: ['windowcoverings_state', 'windowcoverings_set'],
    attribute: ['currentPositionLiftPercentage'],
    type: 'value',
    writable: true,
    sources: ['zigbee-spec', 'johan', 'z2m']
  },

  // Color Control (0x0300)
  768: {
    capability: ['light_hue', 'light_saturation', 'light_temperature'],
    attribute: ['currentHue', 'currentSaturation', 'colorTemperature'],
    type: 'value',
    writable: true,
    sources: ['zigbee-spec', 'johan']
  },

  // Illuminance Measurement (0x0400)
  1024: {
    capability: 'measure_luminance',
    attribute: 'measuredValue',
    type: 'value',
    writable: false,
    converter: 'illuminance',
    sources: ['zigbee-spec', 'johan', 'z2m'],
    notes: 'lux = 10^((value - 1) / 10000)'
  },

  // Temperature Measurement (0x0402)
  1026: {
    capability: 'measure_temperature',
    attribute: 'measuredValue',
    type: 'value',
    writable: false,
    scale: 100,
    sources: ['zigbee-spec', 'johan', 'z2m']
  },

  // Relative Humidity (0x0405)
  1029: {
    capability: 'measure_humidity',
    attribute: 'measuredValue',
    type: 'value',
    writable: false,
    scale: 100,
    sources: ['zigbee-spec', 'johan', 'z2m']
  },

  // Occupancy Sensing (0x0406)
  1030: {
    capability: 'alarm_motion',
    attribute: 'occupancy',
    type: 'bool',
    writable: false,
    sources: ['zigbee-spec', 'johan', 'z2m']
  },

  // IAS Zone (0x0500)
  1280: {
    capability: ['alarm_motion', 'alarm_contact', 'alarm_smoke', 'alarm_water'],
    attribute: 'zoneStatus',
    type: 'bitmap',
    writable: false,
    sources: ['zigbee-spec', 'johan', 'z2m', 'blakadder'],
    notes: 'Zone type determines capability mapping'
  },

  // Electrical Measurement (0x0B04)
  2820: {
    capability: ['measure_power', 'measure_current', 'measure_voltage'],
    attribute: ['activePower', 'rmsCurrent', 'rmsVoltage'],
    type: 'value',
    writable: false,
    sources: ['zigbee-spec', 'johan']
  },

  // Tuya Proprietary (0xEF00)
  61184: {
    capability: 'dynamic', // Dépend des DPs
    type: 'custom',
    writable: true,
    sources: ['z2m', 'zha', 'blakadder', 'johan', 'dlnraja'],
    notes: 'Uses Tuya DataPoints system'
  }
};

/**
 * SOURCES REFERENCES
 * URLs et méthodologies pour chaque source
 */
const SOURCES = {
  'z2m': {
    name: 'Zigbee2MQTT',
    url: 'https://github.com/Koenkk/zigbee2mqtt',
    converters: 'https://github.com/Koenkk/zigbee2mqtt/tree/master/src/devices',
    methodology: 'Converters Tuya avec DPs mappés',
    priority: 1
  },
  'zha': {
    name: 'ZHA Device Handlers',
    url: 'https://github.com/zigpy/zha-device-handlers',
    quirks: 'https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya',
    methodology: 'Quirks Python avec DP definitions',
    priority: 2
  },
  'blakadder': {
    name: 'Blakadder Zigbee Database',
    url: 'https://zigbee.blakadder.com',
    methodology: 'Database devices avec specs complètes',
    priority: 3
  },
  'johan': {
    name: 'Johan Bendz Tuya Zigbee',
    url: 'https://github.com/JohanBendz/com.tuya.zigbee',
    methodology: 'Homey App officielle, drivers validés',
    priority: 4
  },
  'dlnraja': {
    name: 'Dylan Rajasekaram Fork',
    url: 'https://github.com/dlnraja/com.tuya.zigbee',
    methodology: 'Extensions + fixes communautaires',
    priority: 5
  },
  'tuya': {
    name: 'Tuya IoT Platform',
    url: 'https://developer.tuya.com',
    methodology: 'Documentation officielle (limitée)',
    priority: 6
  },
  'homey-forum': {
    name: 'Homey Community Forum',
    url: 'https://community.homey.app',
    methodology: 'Retours utilisateurs + diagnostics',
    priority: 7
  },
  'zigbee-spec': {
    name: 'Zigbee Alliance Specification',
    url: 'https://zigbeealliance.org',
    methodology: 'Spécifications officielles clusters',
    priority: 8
  }
};

/**
 * Get datapoint info by DP number and device type
 * @param {number} dp - Datapoint number
 * @param {string} deviceType - Device type (optional)
 * @returns {Object|null} Datapoint info or null
 */
function getDatapoint(dp, deviceType = null) {
  // Search in all categories
  for (const [category, dps] of Object.entries(DATAPOINT_REGISTRY)) {
    if (dps[dp]) {
      const dpInfo = dps[dp];
      // Filter by device type if specified
      if (deviceType && dpInfo.devices && !dpInfo.devices.includes(deviceType)) {
        continue;
      }
      return {
        ...dpInfo,
        dp: dp,
        category: category
      };
    }
  }
  return null;
}

/**
 * Get cluster info by cluster ID
 * @param {number} clusterId - Cluster ID
 * @returns {Object|null} Cluster info or null
 */
function getCluster(clusterId) {
  return CLUSTER_CAPABILITY_MAP[clusterId] || null;
}

/**
 * Get capability mapping for device
 * @param {Object} device - Device info with clusters and DPs
 * @returns {Array} Array of capability mappings
 */
function getCapabilityMapping(device) {
  const mappings = [];

  // Map standard Zigbee clusters
  if (device.clusters) {
    for (const clusterId of device.clusters) {
      const clusterInfo = getCluster(clusterId);
      if (clusterInfo) {
        mappings.push({
          source: 'cluster',
          clusterId: clusterId,
          ...clusterInfo
        });
      }
    }
  }

  // Map Tuya DataPoints
  if (device.datapoints) {
    for (const dp of device.datapoints) {
      const dpInfo = getDatapoint(dp, device.type);
      if (dpInfo) {
        mappings.push({
          source: 'datapoint',
          dp: dp,
          ...dpInfo
        });
      }
    }
  }

  return mappings;
}

// Export
module.exports = {
  DATAPOINT_REGISTRY,
  CLUSTER_CAPABILITY_MAP,
  SOURCES,
  getDatapoint,
  getCluster,
  getCapabilityMapping,
  ClusterMap
};
