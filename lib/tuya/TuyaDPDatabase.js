'use strict';

/**
 * TUYA DP DATABASE - COMPLETE
 *
 * Sources:
 * - github.com/zigbeefordomoticz/wiki (Tuya-0xEF00.md)
 * - github.com/Koenkk/zigbee2mqtt
 * - developer.tuya.com official docs
 * - zigpy/zigpy discussions
 * - Real device sniffing
 *
 * Cluster: 0xEF00 (61184)
 * Profile: 0x0104
 * Endpoint: 0x01
 *
 * DP Format: [status:1][seq:1][dp:1][type:1][len:2][data:len]
 *
 * Data Types:
 * 0x00 = RAW
 * 0x01 = BOOL (1 byte)
 * 0x02 = VALUE (4 byte uint32)
 * 0x03 = STRING (variable)
 * 0x04 = ENUM (1 byte)
 * 0x05 = FAULT (1 byte bitmap)
 */

const TUYA_DP_DATABASE = {

  // ===================================
  // TRV (Thermostat Radiator Valve)
  // ===================================

  'TRV_V1': {
    // _TYST11_zivfvd7h, _TZE200_zivfvd7h, _TYST11_kfvq6avy
    manufacturers: ['_TYST11_zivfvd7h', '_TZE200_zivfvd7h', '_TYST11_kfvq6avy', '_TYST11_jeaxp72v'],
    model: 'TS0601',
    dps: {
      2: { name: 'setpoint', type: 0x02, unit: '°C', divider: 10, capability: 'target_temperature' },
      3: { name: 'temperature', type: 0x02, unit: '°C', divider: 10, capability: 'measure_temperature' },
      4: { name: 'mode', type: 0x04, values: { 0: 'off', 1: 'auto', 2: 'manual' }, capability: 'thermostat_mode' },
      7: { name: 'child_lock', type: 0x01, capability: 'child_lock' },
      15: { name: 'battery', type: 0x02, unit: '%', capability: 'measure_battery' }
    }
  },

  'TRV_V2': {
    // _TZE200_ckud7u2l, _TYST11_ckud7u2l
    manufacturers: ['_TZE200_ckud7u2l', '_TYST11_ckud7u2l'],
    model: 'TS0601',
    dps: {
      2: { name: 'setpoint', type: 0x02, divider: 10, capability: 'target_temperature' },
      3: { name: 'temperature', type: 0x02, divider: 10, capability: 'measure_temperature' },
      4: { name: 'mode', type: 0x04, values: { 1: 'auto', 2: 'off' }, capability: 'thermostat_mode' },
      7: { name: 'child_lock', type: 0x01, capability: 'child_lock' },
      12: { name: 'window_detection', type: 0x01, capability: 'window_detection' },
      15: { name: 'battery', type: 0x02, capability: 'measure_battery' },
      20: { name: 'valve_state', type: 0x02, capability: 'valve_state' },
      109: { name: 'valve_position', type: 0x02, capability: 'valve_position' },
      110: { name: 'low_battery', type: 0x01, capability: 'alarm_battery' }
    }
  },

  'TRV_V3': {
    // _TZE200_c88teujp, _TYST11_KGbxAXL2, _TYST11_zuhszj9s
    manufacturers: ['_TZE200_c88teujp', '_TYST11_KGbxAXL2', '_TYST11_zuhszj9s'],
    model: 'TS0601',
    dps: {
      8: { name: 'window_detection_status', type: 0x01 },
      18: { name: 'window_detection', type: 0x01, capability: 'window_detection' },
      27: { name: 'calibration', type: 0x02 },
      40: { name: 'child_lock', type: 0x01, capability: 'child_lock' },
      101: { name: 'switch', type: 0x01, capability: 'onoff' },
      102: { name: 'temperature', type: 0x02, divider: 10, capability: 'measure_temperature' },
      103: { name: 'setpoint', type: 0x02, divider: 10, capability: 'target_temperature' },
      106: { name: 'temporary_away', type: 0x01 },
      108: { name: 'mode', type: 0x04, values: { 1: 'auto', 2: 'manual' } },
      130: { name: 'anti_scale', type: 0x01 }
    }
  },

  // ===================================
  // CURTAIN / BLIND MOTORS
  // ===================================

  'CURTAIN_MOTOR': {
    manufacturers: ['_TZE200_rddyvrci', '_TZE200_5zbp6j0u', '_TZE200_nkoabg8w', '_TZE200_xuzcvlku'],
    model: 'TS0601',
    dps: {
      1: { name: 'command', type: 0x01, values: { 0: 'open', 1: 'close', 2: 'stop' }, capability: 'windowcoverings_state' },
      2: { name: 'position_set', type: 0x02, capability: 'windowcoverings_set' },
      3: { name: 'position_current', type: 0x02, capability: 'windowcoverings_set' },
      5: { name: 'direction', type: 0x04 },
      7: { name: 'position_report', type: 0x02, capability: 'windowcoverings_set' }
    }
  },

  // ===================================
  // CLIMATE SENSORS (Temp/Humidity)
  // ===================================

  'CLIMATE_SENSOR': {
    manufacturers: ['_TZE284_vvmbj46n', '_TZE200_yjjdcqsq'],
    model: 'TS0601',
    dps: {
      1: { name: 'temperature', type: 0x02, divider: 10, capability: 'measure_temperature' },
      2: { name: 'humidity', type: 0x02, divider: 10, capability: 'measure_humidity' },
      4: { name: 'battery', type: 0x02, capability: 'measure_battery' },
      15: { name: 'battery_alt', type: 0x02, capability: 'measure_battery' }
    }
  },

  // ===================================
  // SOIL SENSORS
  // ===================================

  'SOIL_SENSOR': {
    manufacturers: ['_TZE284_oitavov2', '_TZE200_myd45weu'],
    model: 'TS0601',
    dps: {
      1: { name: 'air_temperature', type: 0x02, divider: 10, capability: 'measure_temperature' },
      2: { name: 'air_humidity', type: 0x02, divider: 10, capability: 'measure_humidity' },
      3: { name: 'soil_temperature', type: 0x02, divider: 10, capability: 'measure_temperature.soil' },
      5: { name: 'soil_humidity', type: 0x02, divider: 10, capability: 'measure_humidity.soil' },
      4: { name: 'battery', type: 0x02, capability: 'measure_battery' },
      15: { name: 'battery_alt', type: 0x02, capability: 'measure_battery' }
    }
  },

  // ===================================
  // PIR / RADAR MOTION SENSORS
  // ===================================

  'PIR_RADAR': {
    manufacturers: ['_TZE200_rhgsbacq', '_TZE204_qasjif9e'],
    model: 'TS0601',
    dps: {
      1: { name: 'motion', type: 0x01, capability: 'alarm_motion' },
      2: { name: 'sensitivity', type: 0x02, values: { 0: 'low', 1: 'medium', 2: 'high' } },
      4: { name: 'battery', type: 0x02, capability: 'measure_battery' },
      9: { name: 'target_distance', type: 0x02, unit: 'cm', capability: 'distance' },
      101: { name: 'radar_sensitivity', type: 0x02 },
      102: { name: 'illuminance_threshold', type: 0x02, capability: 'measure_luminance' }
    }
  },

  // ===================================
  // SIREN / ALARM
  // ===================================

  'SIREN': {
    manufacturers: ['_TZE200_d0yu2xgi'],
    model: 'TS0601',
    dps: {
      101: { name: 'power_mode', type: 0x04, values: { 0: 'battery', 4: 'battery' } },
      102: { name: 'alarm_melody', type: 0x04 },
      103: { name: 'alarm_duration', type: 0x02, unit: 's' },
      104: { name: 'alarm', type: 0x01, capability: 'alarm_generic' },
      105: { name: 'temperature', type: 0x02, divider: 10, capability: 'measure_temperature' },
      106: { name: 'humidity', type: 0x02, divider: 10, capability: 'measure_humidity' },
      107: { name: 'temp_alarm_min', type: 0x02, divider: 10 },
      108: { name: 'temp_alarm_max', type: 0x02, divider: 10 },
      109: { name: 'humidity_alarm_min', type: 0x02 },
      110: { name: 'humidity_alarm_max', type: 0x02 },
      112: { name: 'temp_unit', type: 0x01, values: { 0: 'F', 1: 'C' } },
      113: { name: 'temp_alarm_status', type: 0x01 },
      114: { name: 'humidity_alarm_status', type: 0x01 },
      116: { name: 'volume', type: 0x04 }
    }
  },

  // ===================================
  // SMART DIMMER
  // ===================================

  'DIMMER': {
    manufacturers: ['_TZE200_dfxkcots'],
    model: 'TS0601',
    dps: {
      1: { name: 'switch', type: 0x01, capability: 'onoff' },
      2: { name: 'level', type: 0x02, capability: 'dim' }
    }
  },

  // ===================================
  // CO DETECTOR (MOES)
  // ===================================

  'CO_DETECTOR': {
    manufacturers: ['_TZE200_htnnfasr'],
    model: 'TS0601',
    dps: {
      1: { name: 'co_status', type: 0x01, capability: 'alarm_co' },
      2: { name: 'co_value', type: 0x02, unit: 'ppm', capability: 'measure_co' },
      4: { name: 'battery', type: 0x02, capability: 'measure_battery' },
      15: { name: 'battery_alt', type: 0x02, capability: 'measure_battery' }
    }
  },

  // ===================================
  // SOIL MOISTURE SENSOR (AUDIT V2)
  // ===================================

  'SOIL_SENSOR': {
    name: 'Tuya Soil Moisture & Temperature Sensor',
    manufacturers: ['_TZE284_oitavov2', '_TZE200_myd45weu'],
    model: 'TS0601',
    dps: {
      1: { name: 'temperature', type: 0x02, divider: 10, unit: '°C', capability: 'measure_temperature' },
      2: { name: 'soil_humidity', type: 0x02, unit: '%', capability: 'measure_humidity.soil' },
      4: { name: 'battery', type: 0x02, unit: '%', capability: 'measure_battery' },
      5: { name: 'battery_state', type: 0x04, enum: { 0: 'low', 1: 'medium', 2: 'high' } }
    }
  },

  // ===================================
  // PIR RADAR MOTION SENSOR (AUDIT V2)
  // ===================================

  'RADAR_PIR': {
    name: 'Tuya PIR Motion Sensor with Illuminance',
    manufacturers: ['_TZE200_rhgsbacq', '_TZE200_ztc6ggyl'],
    model: 'TS0601',
    dps: {
      1: { name: 'presence', type: 0x01, capability: 'alarm_motion' },
      4: { name: 'battery', type: 0x02, unit: '%', capability: 'measure_battery' },
      9: { name: 'illuminance', type: 0x02, unit: 'lux', capability: 'measure_luminance' },
      101: { name: 'sensitivity', type: 0x02, min: 0, max: 9 },
      102: { name: 'far_detection', type: 0x02, unit: 'cm', min: 0, max: 600 },
      103: { name: 'near_detection', type: 0x02, unit: 'cm', min: 0, max: 600 }
      // TODO: Enrichir via DP Discovery pour distance, etc.
    }
  },

  // ===================================
  // SMART PLUG / SOCKET
  // ===================================

  'SMART_PLUG': {
    manufacturers: ['_TZE200_oisqyl4o', '_TZE200_1agwnems'],
    model: 'TS0601',
    dps: {
      1: { name: 'switch', type: 0x01, capability: 'onoff' },
      16: { name: 'voltage', type: 0x02, divider: 10, capability: 'measure_voltage' },
      17: { name: 'current', type: 0x02, divider: 1000, capability: 'measure_current' },
      18: { name: 'power', type: 0x02, divider: 10, capability: 'measure_power' },
      19: { name: 'energy', type: 0x02, divider: 100, capability: 'meter_power' }
    }
  }
};

/**
 * Find DP profile for device
 */
function findDPProfile(manufacturerName, modelId = 'TS0601') {
  const mfrLower = (manufacturerName || '').toLowerCase();
  const modelLower = (modelId || '').toLowerCase();
  for (const [profileName, profile] of Object.entries(TUYA_DP_DATABASE)) {
    if (profile.manufacturers && profile.manufacturers.some(m => m.toLowerCase() === mfrLower)) {
      if (!profile.model || profile.model.toLowerCase() === modelLower) {
        return { name: profileName, ...profile };
      }
    }
  }
  return null;
}

/**
 * Get DP info by number
 */
function getDPInfo(dpNumber, manufacturerName, modelId = 'TS0601') {
  const profile = findDPProfile(manufacturerName, modelId);
  if (!profile || !profile.dps) return null;
  return profile.dps[dpNumber] || null;
}

module.exports = {
  TUYA_DP_DATABASE,
  findDPProfile,
  getDPInfo
};
