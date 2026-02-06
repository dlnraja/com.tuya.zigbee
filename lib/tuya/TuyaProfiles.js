'use strict';

/**
 * Tuya TS0601 Device Profiles - CENTRALIZED
 *
 * Single source of truth for TS0601 DP mappings
 * Based on: Zigbee2MQTT, Z2T, user diagnostics
 *
 * Usage:
 *   const profile = getTuyaProfile(modelId, manufacturer);
 *   if (profile) {
 *     // Use profile.dpMap to configure device
 *   }
 */

/**
 * Tuya TS0601 profiles database
 * Format: 'modelId|manufacturer' or 'modelId|manufacturer_prefix*'
 */
const TUYA_PROFILES = {

  // ========================================
  // CLIMATE MONITORS (Temp + Humidity)
  // ========================================

  'TS0601|_TZE284_vvmbj46n': {
    type: 'climate_monitor',
    name: 'Climate Monitor Temp+Humidity',
    driver: 'climate_sensor',
    dpMap: {
      1: { capability: 'measure_temperature', scale: 10, description: 'Temperature (°C x10)' },
      2: { capability: 'measure_humidity', description: 'Humidity (%)' },
      4: { capability: 'measure_battery', description: 'Battery (%)' },
      9: { type: 'setting', name: 'temp_unit_convert', description: 'Temperature unit' },
      10: { type: 'setting', name: 'max_temp', description: 'Max temperature alarm' },
      11: { type: 'setting', name: 'min_temp', description: 'Min temperature alarm' },
      12: { type: 'setting', name: 'max_humidity', description: 'Max humidity alarm' },
      13: { type: 'setting', name: 'min_humidity', description: 'Min humidity alarm' }
    }
  },

  // ========================================
  // SOIL SENSORS (Temp + Soil Humidity)
  // ========================================

  'TS0601|_TZE284_oitavov2': {
    type: 'soil_sensor',
    name: 'QT-07S Soil Tester Temp+Humidity',
    driver: 'soil_sensor',
    dpMap: {
      2: { type: 'setting', name: 'temp_unit', description: 'Temperature unit (0=C, 1=F)' },
      3: { capability: 'measure_soil_moisture', description: 'Soil Moisture (%)' },
      5: { capability: 'measure_temperature', scale: 10, description: 'Temperature (°C x10)' },
      14: { type: 'internal', name: 'battery_state', description: 'Battery state enum (0=low, 1=med, 2=high)' },
      15: { capability: 'measure_battery', description: 'Battery (%)' },
      109: { capability: 'measure_humidity', description: 'Air Humidity (%)' }
    }
  },

  // Soil sensor variant (unverified - not in any driver fingerprint list)
  // NOTE: _TZE284_qa4yfxk2 has no Z2M/ZHA/driver reference. DPs assumed from standard soil pattern.
  'TS0601|_TZE284_qa4yfxk2': {
    type: 'soil_sensor',
    name: 'Soil Sensor Variant (unverified)',
    driver: 'soil_sensor',
    dpMap: {
      3: { capability: 'measure_soil_moisture', description: 'Soil Moisture (%)' },
      5: { capability: 'measure_temperature', scale: 10, description: 'Temperature (°C x10)' },
      15: { capability: 'measure_battery', description: 'Battery (%)' }
    }
  },

  // ========================================
  // RADAR PRESENCE SENSORS
  // ========================================

  'TS0601|_TZE200_rhgsbacq': {
    type: 'radar_presence',
    name: 'HOBEIAN 10G Multi-sensor Radar (ZG-227Z)',
    driver: 'presence_sensor_radar',
    dpMap: {
      1: { capability: 'alarm_motion', description: 'Presence detected' },
      101: { capability: 'measure_humidity', description: 'Humidity (÷10)' },
      106: { capability: 'measure_luminance', description: 'Illuminance (lux)' },
      111: { capability: 'measure_temperature', scale: 10, description: 'Temperature (°C ÷10)' }
    }
  },

  'TS0601|_TZE200_ztc6ggyl': {
    type: 'radar_presence',
    name: 'FP1/FP2 Style Radar Presence Sensor',
    driver: 'presence_sensor_radar',
    dpMap: {
      1: { capability: 'alarm_motion', description: 'Presence detected' },
      2: { type: 'setting', name: 'sensitivity', description: 'Sensitivity' },
      3: { type: 'setting', name: 'keep_time', description: 'Keep time' },
      4: { type: 'setting', name: 'detection_distance', description: 'Detection distance (÷100)' },
      9: { type: 'internal', name: 'distance', description: 'Target distance (÷100)' },
      102: { capability: 'measure_luminance', description: 'Illuminance (lux)' }
    }
  },

  // ========================================
  // GENERIC TS0601 FALLBACK
  // ========================================

  'TS0601|_TZE*': {
    type: 'generic_tuya_dp',
    name: 'Generic Tuya DP Device',
    driver: null, // Auto-detect
    dpMap: {
      1: { type: 'auto', description: 'DP1 - Auto-detect' },
      2: { type: 'auto', description: 'DP2 - Auto-detect' },
      4: { capability: 'measure_battery', description: 'Battery (typical)' }
    }
  }
};

/**
 * Get Tuya profile for a device
 *
 * @param {string} modelId - Device model ID (e.g. 'TS0601')
 * @param {string} manufacturer - Manufacturer name (e.g. '_TZE284_vvmbj46n')
 * @returns {Object|null} - Profile object or null
 */
function getTuyaProfile(modelId, manufacturer) {
  if (!modelId || !manufacturer) return null;

  // Try exact match first
  const exactKey = `${modelId}|${manufacturer}`;
  if (TUYA_PROFILES[exactKey]) {
    return { ...TUYA_PROFILES[exactKey], key: exactKey };
  }

  // Try wildcard match (e.g. TS0601|_TZE*) - case-insensitive
  const modelLower = (modelId || '').toLowerCase();
  const mfrLower = (manufacturer || '').toLowerCase();
  for (const [key, profile] of Object.entries(TUYA_PROFILES)) {
    const [profileModel, profileManufacturer] = key.split('|');

    if (profileModel.toLowerCase() === modelLower && profileManufacturer.endsWith('*')) {
      const prefix = profileManufacturer.slice(0, -1).toLowerCase();
      if (mfrLower.startsWith(prefix)) {
        return { ...profile, key };
      }
    }
  }

  return null;
}

/**
 * Get DP mapping for a specific capability
 *
 * @param {Object} profile - Tuya profile
 * @param {string} capability - Capability name (e.g. 'measure_temperature')
 * @returns {Array} - Array of {dp, config} for this capability
 */
function getDPsForCapability(profile, capability) {
  if (!profile || !profile.dpMap) return [];

  const result = [];

  for (const [dp, config] of Object.entries(profile.dpMap)) {
    if (config.capability === capability) {
      result.push({ dp: parseInt(dp), config });
    }
  }

  return result;
}

/**
 * Get all capabilities from profile
 *
 * @param {Object} profile - Tuya profile
 * @returns {Array<string>} - Array of capability names
 */
function getProfileCapabilities(profile) {
  if (!profile || !profile.dpMap) return [];

  const capabilities = new Set();

  for (const config of Object.values(profile.dpMap)) {
    if (config.capability) {
      capabilities.add(config.capability);
    }
  }

  return Array.from(capabilities);
}

module.exports = {
  TUYA_PROFILES,
  getTuyaProfile,
  getDPsForCapability,
  getProfileCapabilities
};
