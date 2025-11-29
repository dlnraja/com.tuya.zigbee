'use strict';

/**
 * Device Fingerprint Database - Consolidated from all versions
 *
 * This database maps (modelId + manufacturerName) to driver info and DP mappings.
 * Used by Smart Adapt and Migration systems.
 *
 * Structure:
 * {
 *   "manufacturerName": {
 *     driverId: "target_driver",
 *     type: "sensor|switch|button|...",
 *     powerSource: "battery|mains|dc",
 *     batteryType: "CR2032|AAA|...",
 *     dps: { dpId: "capability_or_function" },
 *     capabilities: ["cap1", "cap2"],
 *     clusters: [clusterId1, clusterId2]
 *   }
 * }
 */

const DEVICE_FINGERPRINTS = {
  // ═══════════════════════════════════════════════════════════════
  // CLIMATE / TEMPERATURE / HUMIDITY SENSORS
  // ═══════════════════════════════════════════════════════════════

  '_TZE284_vvmbj46n': {
    driverId: 'climate_sensor',
    type: 'climate',
    powerSource: 'battery',
    batteryType: 'AAA',
    modelIds: ['TS0601', 'ZTH05Z'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      1: 'temperature',      // value / 10
      2: 'humidity',         // percentage
      4: 'battery'           // percentage
    }
  },

  '_TZE284_znlqjmih': {
    driverId: 'climate_sensor',
    type: 'climate',
    powerSource: 'battery',
    batteryType: 'AAA',
    modelIds: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      1: 'temperature',
      2: 'humidity',
      4: 'battery'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // SOIL SENSORS
  // ═══════════════════════════════════════════════════════════════

  '_TZE284_oitavov2': {
    driverId: 'soil_sensor',
    type: 'soil',
    powerSource: 'battery',
    batteryType: 'AAA',
    modelIds: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      3: 'temperature',      // value / 10
      4: 'humidity',         // soil moisture %
      5: 'temperature_alt',  // value / 10
      6: 'humidity_alt',     // soil moisture %
      7: 'soil_moisture',    // soil moisture %
      14: 'battery',         // percentage
      15: 'battery_alt',     // percentage
      101: 'battery_101'     // percentage
    }
  },

  '_TZE200_myd45weu': {
    driverId: 'soil_sensor',
    type: 'soil',
    powerSource: 'battery',
    modelIds: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      5: 'temperature',
      6: 'humidity',
      14: 'battery'
    }
  },

  '_TZE284_myd45weu': {
    driverId: 'soil_sensor',
    type: 'soil',
    powerSource: 'battery',
    modelIds: ['TS0601'],
    capabilities: ['measure_temperature', 'measure_humidity', 'measure_battery'],
    dps: {
      5: 'temperature',
      6: 'humidity',
      14: 'battery'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // MOTION / PRESENCE / RADAR SENSORS
  // ═══════════════════════════════════════════════════════════════

  '_TZE200_rhgsbacq': {
    driverId: 'motion_sensor_radar_mmwave',
    type: 'radar',
    powerSource: 'battery',
    batteryType: 'CR2032',
    modelIds: ['TS0601'],
    capabilities: ['alarm_motion', 'measure_battery', 'measure_luminance'],
    clusters: [1280], // IAS Zone
    dps: {
      1: 'presence',         // boolean
      9: 'sensitivity',      // 0-10
      15: 'battery',         // percentage
      101: 'illuminance',    // lux
      102: 'detection_delay' // seconds
    },
    notes: 'Uses IAS Zone for motion detection, Tuya DP for additional data'
  },

  '_TZE204_iaeejhvf': {
    driverId: 'presence_sensor_radar',
    type: 'radar',
    powerSource: 'mains',
    modelIds: ['TS0601'],
    capabilities: ['alarm_motion', 'measure_luminance'],
    dps: {
      1: 'presence',
      2: 'sensitivity',
      101: 'illuminance'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // BUTTONS / SOS
  // ═══════════════════════════════════════════════════════════════

  '_TZ3000_0dumfk2z': {
    driverId: 'button_emergency_sos',
    type: 'button',
    powerSource: 'battery',
    batteryType: 'CR2032',
    modelIds: ['TS0215A'],
    capabilities: ['alarm_generic', 'measure_battery'],
    clusters: [1280], // IAS Zone
    dps: {
      1: 'button_press',
      101: 'battery'
    },
    notes: 'IAS Zone for button press, DP or genPowerCfg for battery'
  },

  // ═══════════════════════════════════════════════════════════════
  // SWITCHES (Mains Powered)
  // ═══════════════════════════════════════════════════════════════

  '_TZ3000_h1ipgkwn': {
    driverId: 'switch_2gang',
    type: 'switch',
    powerSource: 'mains',
    modelIds: ['TS0002'],
    capabilities: ['onoff', 'onoff.gang2'],
    clusters: [6], // OnOff
    dps: {},
    notes: 'Standard Zigbee OnOff, no battery'
  },

  // ═══════════════════════════════════════════════════════════════
  // PLUGS (Mains Powered)
  // ═══════════════════════════════════════════════════════════════

  '_TZ3000_kdi2o9m6': {
    driverId: 'plug_smart',
    type: 'plug',
    powerSource: 'mains',
    modelIds: ['TS0121'],
    capabilities: ['onoff', 'measure_power', 'meter_power'],
    clusters: [6, 2820], // OnOff, Electrical Measurement
    dps: {}
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTACT SENSORS
  // ═══════════════════════════════════════════════════════════════

  '_TZ3000_decxrtwa': {
    driverId: 'contact_sensor',
    type: 'contact',
    powerSource: 'battery',
    batteryType: 'CR2032',
    modelIds: ['TS0203'],
    capabilities: ['alarm_contact', 'measure_battery'],
    clusters: [1280], // IAS Zone
    dps: {}
  }
};

/**
 * Get device fingerprint by manufacturer name
 */
function getFingerprint(manufacturerName) {
  return DEVICE_FINGERPRINTS[manufacturerName] || null;
}

/**
 * Get driver ID for a device
 */
function getDriverId(manufacturerName, modelId) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  if (fp) {
    // Validate modelId if provided
    if (modelId && fp.modelIds && !fp.modelIds.includes(modelId)) {
      console.log(`[FINGERPRINT-DB] Warning: modelId ${modelId} not in expected list for ${manufacturerName}`);
    }
    return fp.driverId;
  }
  return null;
}

/**
 * Get DP mapping for a device
 */
function getDPMapping(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.dps : {};
}

/**
 * Check if device is battery powered
 */
function isBatteryPowered(manufacturerName) {
  const fp = DEVICE_FINGERPRINTS[manufacturerName];
  return fp ? fp.powerSource === 'battery' : null;
}

/**
 * Get all fingerprints for a driver
 */
function getFingerprintsForDriver(driverId) {
  const result = [];
  for (const [mfr, fp] of Object.entries(DEVICE_FINGERPRINTS)) {
    if (fp.driverId === driverId) {
      result.push({ manufacturerName: mfr, ...fp });
    }
  }
  return result;
}

/**
 * Get all manufacturer names
 */
function getAllManufacturerNames() {
  return Object.keys(DEVICE_FINGERPRINTS);
}

/**
 * Add or update fingerprint (for runtime updates)
 */
function setFingerprint(manufacturerName, fingerprint) {
  DEVICE_FINGERPRINTS[manufacturerName] = fingerprint;
}

module.exports = {
  DEVICE_FINGERPRINTS,
  getFingerprint,
  getDriverId,
  getDPMapping,
  isBatteryPowered,
  getFingerprintsForDriver,
  getAllManufacturerNames,
  setFingerprint
};
