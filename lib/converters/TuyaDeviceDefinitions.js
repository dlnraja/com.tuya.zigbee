'use strict';

/**
 * TUYA DEVICE DEFINITIONS - Compatible with zigbee-herdsman-converters format
 *
 * This file mirrors the structure from:
 * - https://github.com/Koenkk/zigbee-herdsman-converters
 * - https://github.com/zigpy/zha-device-handlers
 *
 * Sources:
 * - Zigbee2MQTT device database
 * - ZHA quirks
 * - SmartHomeScene reviews
 * - Blakadder Zigbee database
 *
 * Format:
 * Each device has:
 * - fingerprint: Array of {modelID, manufacturerName}
 * - model: Commercial model name
 * - vendor: Manufacturer/Brand
 * - description: Device description
 * - exposes: Capabilities exposed (Homey capabilities)
 * - tuyaDatapoints: DP to capability mapping [dp, key, converter]
 *
 * @version 5.2.64
 * @updated 2024-11-30
 */

// Value converters (mirroring zigbee-herdsman-converters/lib/tuya.js)
const valueConverter = {
  raw: (value) => value,
  trueFalse: (value) => Boolean(value),
  divideBy10: (value) => value / 10,
  divideBy100: (value) => value / 100,
  divideBy1000: (value) => value / 1000,
  multiply0_01: (value) => value * 0.01,
  temperatureUnit: (value) => value === 0 ? 'celsius' : 'fahrenheit',

  // Presence sensor states
  presenceState: (value) => {
    const states = { 0: 'none', 1: 'presence', 2: 'move' };
    return states[value] || 'unknown';
  },

  motionState: (value) => {
    const states = { 0: 'none', 1: 'small', 2: 'medium', 3: 'large', 4: 'static' };
    return states[value] || 'unknown';
  },

  // Enum lookup generator
  lookup: (mapping) => (value) => mapping[value] !== undefined ? mapping[value] : value,

  // Inverse boolean
  onOffNotInverted: (value) => Boolean(value),
  onOffInverted: (value) => !value,

  // Scale converters
  scale: (min, max, minTo, maxTo) => (value) => {
    return ((value - min) / (max - min)) * (maxTo - minTo) + minTo;
  }
};

// ============================================================================
// PRESENCE SENSORS (24GHz mmWave)
// ============================================================================

const PRESENCE_SENSORS = [
  // ZY-M100-24G - Most common presence sensor
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE204_sxm7l9xa' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_sxm7l9xa' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_e5m9c5hl' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_e5m9c5hl' },
    ],
    model: 'ZY-M100-24G',
    vendor: 'Tuya',
    description: '24GHz mmWave human presence sensor',
    exposes: ['alarm_motion', 'measure_luminance', 'measure_distance'],
    tuyaDatapoints: [
      [1, 'alarm_motion', valueConverter.presenceState],
      [2, 'radar_sensitivity', valueConverter.raw],
      [3, 'minimum_range', valueConverter.divideBy100],
      [4, 'maximum_range', valueConverter.divideBy100],
      [6, 'self_test', valueConverter.raw],
      [9, 'measure_distance', valueConverter.divideBy100],
      [101, 'presence_timeout', valueConverter.raw],
      [102, 'motion_state', valueConverter.motionState],
      [104, 'measure_luminance', valueConverter.raw],
    ]
  },

  // ZG-205Z - 5.8GHz/24GHz presence sensor (USB powered)
  {
    fingerprint: [
      { modelID: 'TS0225', manufacturerName: '_TZE200_2aaelwxk' },
      { modelID: 'TS0225', manufacturerName: '_TZE204_2aaelwxk' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_hl0ss9oa' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_hl0ss9oa' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_ztqnh5cg' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_ztqnh5cg' },
    ],
    model: 'ZG-205Z',
    vendor: 'Tuya',
    description: '5.8GHz/24GHz USB presence sensor with illuminance',
    exposes: ['alarm_motion', 'measure_luminance'],
    tuyaDatapoints: [
      [1, 'alarm_motion', valueConverter.trueFalse],
      [2, 'motion_sensitivity', valueConverter.raw], // 1-10
      [3, 'static_sensitivity', valueConverter.raw], // 1-10
      [4, 'detection_range', valueConverter.divideBy100],
      [101, 'motion_state', valueConverter.motionState],
      [102, 'fading_time', valueConverter.raw],
      [104, 'measure_luminance', valueConverter.raw],
    ]
  },

  // ZG-204ZM - Battery powered PIR + mmWave (2xAAA)
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE200_2aaelwxk' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_rhgsbacq' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_rhgsbacq' },
    ],
    model: 'ZG-204ZM',
    vendor: 'Tuya',
    description: 'Battery PIR + 24GHz mmWave presence sensor (2xAAA)',
    exposes: ['alarm_motion', 'measure_luminance', 'measure_battery'],
    tuyaDatapoints: [
      [1, 'alarm_motion', valueConverter.trueFalse],
      [9, 'radar_sensitivity', valueConverter.raw], // 0-9
      [15, 'measure_battery', valueConverter.raw],
      [101, 'detection_delay', valueConverter.divideBy10],
      [102, 'fading_time', valueConverter.divideBy10],
      [103, 'measure_luminance', valueConverter.raw],
      [104, 'led_indicator', valueConverter.trueFalse],
      [107, 'presence_state', valueConverter.presenceState],
      [108, 'motion_state', valueConverter.motionState],
      [109, 'led_indicator', valueConverter.trueFalse],
      [110, 'static_detection_distance', valueConverter.divideBy10],
      [111, 'static_detection_sensitivity', valueConverter.raw],
    ]
  },

  // WZ-M100 - Wenzhi presence sensor
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE204_laokfqwu' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_laokfqwu' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_7gclukjs' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_7gclukjs' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_ya4ft0w4' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_ya4ft0w4' },
    ],
    model: 'WZ-M100',
    vendor: 'Wenzhi',
    description: '24GHz human presence sensor (ceiling/wall mount)',
    exposes: ['alarm_motion', 'measure_luminance', 'measure_distance'],
    tuyaDatapoints: [
      [1, 'alarm_motion', valueConverter.trueFalse],
      [2, 'motion_sensitivity', valueConverter.raw],
      [3, 'minimum_range', valueConverter.divideBy100],
      [4, 'maximum_range', valueConverter.divideBy100],
      [9, 'measure_distance', valueConverter.divideBy100],
      [101, 'presence_timeout', valueConverter.raw],
      [102, 'motion_state', valueConverter.motionState],
      [104, 'measure_luminance', valueConverter.raw],
    ]
  },
];

// ============================================================================
// CLIMATE SENSORS (Temperature, Humidity, etc.)
// ============================================================================

const CLIMATE_SENSORS = [
  // Soil sensor
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE200_myd45weu' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_ga1maeof' },
      { modelID: 'TS0601', manufacturerName: '_TZE284_aao3yzhs' },
    ],
    model: 'TS0601_soil',
    vendor: 'Tuya',
    description: 'Soil moisture and temperature sensor',
    exposes: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    tuyaDatapoints: [
      [3, 'measure_humidity', valueConverter.raw], // Soil moisture %
      [5, 'measure_temperature', valueConverter.divideBy10],
      [14, 'measure_battery', valueConverter.raw],
      [15, 'measure_battery', valueConverter.raw], // Alternative DP
      [101, 'measure_battery', valueConverter.raw], // Another alternative
    ]
  },

  // Temperature & Humidity with display (ZTH05)
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE200_locansqn' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe' },
      { modelID: 'TS0601', manufacturerName: '_TZE200_pisltm67' },
    ],
    model: 'ZTH05',
    vendor: 'Tuya',
    description: 'Temperature and humidity sensor with LCD display',
    exposes: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    tuyaDatapoints: [
      [1, 'measure_temperature', valueConverter.divideBy10],
      [2, 'measure_humidity', valueConverter.raw],
      [4, 'measure_battery', valueConverter.raw],
      [9, 'temperature_unit', valueConverter.temperatureUnit],
    ]
  },
];

// ============================================================================
// SWITCHES & RELAYS
// ============================================================================

const SWITCHES = [
  // DIN Rail relay with power monitoring (ATMS1602Z)
  {
    fingerprint: [
      { modelID: 'TS011F', manufacturerName: '_TZ3000_aigddb2b' },
      { modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz' },
      { modelID: 'TS011F', manufacturerName: '_TZ3000_ky0fq4ho' },
    ],
    model: 'ATMS1602Z',
    vendor: 'Tuya',
    description: 'DIN rail smart relay 16A with power monitoring',
    exposes: ['onoff', 'measure_power', 'meter_power', 'measure_current', 'measure_voltage'],
    // Note: TS011F uses standard Zigbee clusters, not Tuya DP
    useStandardZigbee: true,
    clusters: {
      onOff: { endpoint: 1 },
      metering: { endpoint: 1 },
      electricalMeasurement: { endpoint: 1 },
    }
  },

  // Moes relay module 2CH
  {
    fingerprint: [
      { modelID: 'TS0601', manufacturerName: '_TZE200_e3oitdyu' },
      { modelID: 'TS0601', manufacturerName: '_TZE204_e3oitdyu' },
    ],
    model: 'ZM-104B-M',
    vendor: 'Moes',
    description: '2-channel relay module with power monitoring',
    exposes: ['onoff.1', 'onoff.2', 'measure_power'],
    tuyaDatapoints: [
      [1, 'onoff_1', valueConverter.trueFalse],
      [2, 'onoff_2', valueConverter.trueFalse],
      [9, 'countdown_1', valueConverter.raw],
      [10, 'countdown_2', valueConverter.raw],
      [17, 'measure_power', valueConverter.raw],
      [18, 'measure_current', valueConverter.divideBy1000],
      [19, 'measure_voltage', valueConverter.divideBy10],
    ]
  },
];

// ============================================================================
// BUTTONS & REMOTES
// ============================================================================

const BUTTONS = [
  // 4-button wireless remote (TS0044)
  {
    fingerprint: [
      { modelID: 'TS0044', manufacturerName: '_TZ3000_u3nv1jwk' },
      { modelID: 'TS0044', manufacturerName: '_TZ3000_wkai4ga5' },
      { modelID: 'TS0044', manufacturerName: '_TZ3000_vp6clf9d' },
    ],
    model: 'TS0044',
    vendor: 'Tuya',
    description: '4-button wireless remote',
    exposes: ['action', 'measure_battery'],
    useStandardZigbee: true,
    clusters: {
      scenes: { endpoints: [1, 2, 3, 4] },
      powerConfiguration: { endpoint: 1 },
    },
    actions: {
      single: 0,
      double: 1,
      hold: 2,
    }
  },

  // SOS emergency button (TS0215A)
  {
    fingerprint: [
      { modelID: 'TS0215A', manufacturerName: '_TZ3000_0dumfk2z' },
      { modelID: 'TS0215A', manufacturerName: '_TYZB01_sqmd19i1' },
    ],
    model: 'TS0215A',
    vendor: 'Tuya',
    description: 'SOS emergency button',
    exposes: ['action', 'measure_battery'],
    useStandardZigbee: true,
    clusters: {
      iasZone: { endpoint: 1 },
      powerConfiguration: { endpoint: 1 },
    }
  },
];

// ============================================================================
// EXPORT ALL DEFINITIONS
// ============================================================================

const ALL_DEFINITIONS = [
  ...PRESENCE_SENSORS,
  ...CLIMATE_SENSORS,
  ...SWITCHES,
  ...BUTTONS,
];

/**
 * Find device definition by fingerprint
 * @param {string} modelID - Zigbee model ID
 * @param {string} manufacturerName - Manufacturer name
 * @returns {Object|null} Device definition or null
 */
function findDefinition(modelID, manufacturerName) {
  for (const def of ALL_DEFINITIONS) {
    for (const fp of def.fingerprint) {
      if (fp.modelID === modelID && fp.manufacturerName === manufacturerName) {
        return def;
      }
    }
  }
  return null;
}

/**
 * Get all fingerprints for a given model
 * @param {string} model - Commercial model name
 * @returns {Array} Array of fingerprints
 */
function getFingerprints(model) {
  const def = ALL_DEFINITIONS.find(d => d.model === model);
  return def ? def.fingerprint : [];
}

/**
 * Get Tuya datapoint mapping for a device
 * @param {string} modelID - Zigbee model ID
 * @param {string} manufacturerName - Manufacturer name
 * @returns {Array|null} tuyaDatapoints array or null
 */
function getDatapoints(modelID, manufacturerName) {
  const def = findDefinition(modelID, manufacturerName);
  return def ? def.tuyaDatapoints : null;
}

/**
 * Parse a Tuya DP value using the device definition
 * @param {string} modelID - Zigbee model ID
 * @param {string} manufacturerName - Manufacturer name
 * @param {number} dp - Datapoint ID
 * @param {*} value - Raw value
 * @returns {Object|null} {key, value} or null
 */
function parseDatapoint(modelID, manufacturerName, dp, value) {
  const datapoints = getDatapoints(modelID, manufacturerName);
  if (!datapoints) return null;

  const mapping = datapoints.find(m => m[0] === dp);
  if (!mapping) return null;

  const [, key, converter] = mapping;
  const parsedValue = converter ? converter(value) : value;

  return { key, value: parsedValue };
}

module.exports = {
  valueConverter,
  PRESENCE_SENSORS,
  CLIMATE_SENSORS,
  SWITCHES,
  BUTTONS,
  ALL_DEFINITIONS,
  findDefinition,
  getFingerprints,
  getDatapoints,
  parseDatapoint,
};
