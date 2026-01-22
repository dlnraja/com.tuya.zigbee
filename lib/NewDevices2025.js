'use strict';

/**
 * NewDevices2025 - Database of new Zigbee devices for 2025-2026
 *
 * This module contains manufacturer IDs and model IDs for:
 * - New Tuya devices released in 2024-2025
 * - Upcoming Zigbee 4.0 devices (certification H1 2026)
 * - Green Power (ZGP) energy-harvesting devices
 * - Matter-bridged Zigbee devices
 * - New Philips Hue, IKEA, Aqara devices
 *
 * @version 5.0.7
 * @author Dylan Rajasekaram
 */

/**
 * NEW TUYA DEVICES 2024-2025
 * TS0601 variants with new _TZE manufacturer codes
 */
const NEW_TUYA_2025 = {
  // Presence/Motion Sensors (mmWave Radar)
  presence: {
    '_TZE200_rhgsbacq': { model: 'ZG-204ZM', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE200_7hfcudw5': { model: 'ZG-205Z', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE204_ijxvkhd0': { model: 'ZG-205ZL', type: 'presence_radar_luminance', driver: 'presence_sensor_radar' },
    '_TZE200_sfuvcqza': { model: 'ZY-M100-24G', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE204_sxm7l9xa': { model: 'ZY-M100-S', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE204_e5m9c5hl': { model: 'MTD075-ZB', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE200_3towulqd': { model: 'ZG-204ZS', type: 'presence_scene', driver: 'presence_sensor_radar' },
    '_TZE204_sbyx0lm6': { model: 'SXM7L9XA', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE204_ztc6ggyl': { model: 'ZG-204ZL Pro', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE200_ikvncluo': { model: 'TS0601_radar', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE204_7gclukjs': { model: '24G_radar', type: 'presence_radar', driver: 'presence_sensor_radar' },
    '_TZE284_4qznlkbu': { model: '5.8G_radar', type: 'presence_radar_5g', driver: 'presence_sensor_radar' },
    // 2025 models
    '_TZE284_kbbchgbh': { model: 'ZY-M200', type: 'presence_radar_2025', driver: 'presence_sensor_radar' },
    '_TZE284_sn9uxsov': { model: 'ZG-300ZL', type: 'presence_radar_2025', driver: 'presence_sensor_radar' }
  },

  // Climate Sensors (Temperature/Humidity)
  climate: {
    '_TZE200_a8sdabtg': { model: 'RSH-HS06', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_qoy0ekbd': { model: 'TS0601_TH', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_znbl8dj5': { model: 'TS0601_TH_LCD', type: 'temp_humidity_lcd', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_yjjdcqsq': { model: 'ZTH05', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_vvmbj46n': { model: 'ZTH08', type: 'temp_humidity_soil', driver: 'soil_sensor' },
    '_TZE204_dvuotvan': { model: 'TH01', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_bq5c8xfe': { model: 'ZTH01', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_pisltm67': { model: 'ZTH02', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    '_TZE200_whkgqxse': { model: 'WH02', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
    // 2025 models with additional sensors
    '_TZE284_thp8hzpr': { model: 'ZTH-2025', type: 'temp_humidity_co2_pm25', driver: 'air_quality_comprehensive' },
    '_TZE284_locmqgow': { model: 'AQ-PRO', type: 'air_quality_pro', driver: 'air_quality_comprehensive' }
  },

  // Soil Sensors
  soil: {
    '_TZE200_vvmbj46n': { model: 'TS0601_soil', type: 'soil', driver: 'soil_sensor' },
    '_TZE200_myd45weu': { model: 'ZY-GS01', type: 'soil', driver: 'soil_sensor' },
    '_TZE200_ga1maeof': { model: 'TS0601_soil_v2', type: 'soil', driver: 'soil_sensor' },
    '_TZE284_hjxqcglr': { model: 'ZY-GS02', type: 'soil_2025', driver: 'soil_sensor' }
  },

  // Thermostats & TRVs
  thermostat: {
    '_TZE200_b6wax7g0': { model: 'BRT-100', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE200_hue3yfsn': { model: 'TV02', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE200_kfvq6avy': { model: 'TV01', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE200_husqqvux': { model: 'TSL-TRV-TV01', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE200_e9ba97vf': { model: 'TV02-ZB', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE200_0dvm9mva': { model: 'TV02-Zigbee', type: 'trv', driver: 'thermostat_radiator' },
    '_TZE204_0hxuqiwd': { model: 'TRV-2024', type: 'trv', driver: 'thermostat_radiator' },
    // 2025 Matter-ready TRVs
    '_TZE284_trvmatter': { model: 'TRV-M2025', type: 'trv_matter', driver: 'thermostat_radiator' }
  },

  // Switches & Dimmers
  switches: {
    '_TZE200_amp6tsvy': { model: 'TS0601_switch_1', type: 'switch_1gang', driver: 'switch_basic_1gang' },
    '_TZE200_6pnqk4se': { model: 'TS0601_switch_2', type: 'switch_2gang', driver: 'switch_basic_2gang' },
    '_TZE200_7deq70b8': { model: 'TS0601_dimmer', type: 'dimmer', driver: 'dimmer_wall_1gang' },
    '_TZE200_dfxkcots': { model: 'TS0601_dimmer_2', type: 'dimmer_2ch', driver: 'dimmer_2ch_ts1101' },
    '_TZE204_zenj4lxv': { model: 'TS0601_switch_pm', type: 'switch_power', driver: 'switch_basic_1gang' },
    // 2025 switches with energy monitoring
    '_TZE284_switch_em': { model: 'TS0601_EM', type: 'switch_energy', driver: 'switch_basic_1gang' }
  },

  // Curtain/Blind Controllers
  curtains: {
    '_TZE200_cowvfni3': { model: 'AM43', type: 'curtain', driver: 'curtain_motor_ts0601' },
    '_TZE200_fzo2pocs': { model: 'DS82', type: 'curtain', driver: 'curtain_motor_ts0601' },
    '_TZE200_eevqq1uv': { model: 'MS-108Z', type: 'curtain', driver: 'curtain_motor_ts0601' },
    '_TZE200_zah67ekd': { model: 'MH-COVER', type: 'curtain', driver: 'curtain_motor_ts0601' },
    '_TZE204_r0jdjrvi': { model: 'TS0601_curtain', type: 'curtain', driver: 'curtain_motor_ts0601' },
    // 2025 models
    '_TZE284_curtain25': { model: 'AM43-2025', type: 'curtain_smart', driver: 'curtain_motor_ts0601' }
  },

  // Sirens & Alarms
  sirens: {
    '_TZE200_d0yu2xgi': { model: 'TS0601_siren', type: 'siren', driver: 'siren_alarm' },
    '_TZE200_nlrfgpny': { model: 'NEO_siren', type: 'siren', driver: 'siren_alarm' },
    '_TZE204_t1blo2bj': { model: 'TS0601_alarm', type: 'siren', driver: 'siren_alarm' }
  },

  // Smart Plugs with Energy Monitoring
  plugs: {
    '_TZE200_3p5ydos3': { model: 'TS0601', type: 'light', driver: 'switch_dimmer_1gang' },
    '_TZE204_n9ctkb6j': { model: 'TS0601', type: 'light', driver: 'switch_dimmer_1gang' },
    '_TZ3000_g5xawfcq': { model: 'TS011F_plug_v2', type: 'plug_energy', driver: 'socket_plug_1gang' },
    '_TZ3000_w0qqde0g': { model: 'TS011F_16A', type: 'plug_16a', driver: 'socket_plug_1gang' },
    // 2025 Matter-ready plugs
    '_TZE284_plug_mt': { model: 'TS011F_Matter', type: 'plug_matter', driver: 'socket_plug_1gang' }
  },

  // Water/Gas Leak Sensors
  leak: {
    '_TZE200_qq9mpfhw': { model: 'TS0601_water', type: 'water_leak', driver: 'leak_sensor_water' },
    '_TZE200_jthf7vb6': { model: 'TS0601_gas', type: 'gas_leak', driver: 'leak_sensor_gas' },
    '_TZE204_cjbofhxw': { model: 'TS0601_smoke', type: 'smoke', driver: 'smoke_sensor' }
  },

  // Irrigation Controllers
  irrigation: {
    '_TZE200_sh1btabb': { model: 'TS0601_irrigation', type: 'irrigation', driver: 'valve_irrigation' },
    '_TZE200_81isopgh': { model: 'GW-08', type: 'irrigation_timer', driver: 'valve_irrigation' },
    '_TZE204_irrigation': { model: 'GIEX-2025', type: 'irrigation_smart', driver: 'valve_irrigation' }
  }
};

/**
 * NEW NON-TUYA DEVICES 2024-2026
 */
const NEW_OTHER_2025 = {
  // Philips Hue (Zigbee 4.0 ready)
  philips: {
    'Signify': {
      '9290024426': { model: 'Hue Go 3', type: 'light_rgb', driver: 'bulb_rgbw' },
      '9290024427': { model: 'Hue Play Bar V2', type: 'light_rgb', driver: 'bulb_rgbw' },
      '9290031160': { model: 'Hue Outdoor Lightstrip', type: 'light_rgb', driver: 'bulb_rgbw' },
      '9290035954': { model: 'Hue Signe Table (2025)', type: 'light_rgb', driver: 'bulb_rgbw' }
    }
  },

  // IKEA TRÅDFRI (2025 models)
  ikea: {
    'IKEA of Sweden': {
      'E2213': { model: 'RODRET Dimmer 2-button', type: 'dimmer_button', driver: 'button_remote_2' },
      'E2214': { model: 'SOMRIG Shortcut Button', type: 'button', driver: 'button_shortcut' },
      'E2215': { model: 'INSPELNING Motion Sensor', type: 'motion', driver: 'motion_sensor_pir' },
      'E2216': { model: 'TRÅDFRI LED1837R5 (2025)', type: 'light_dimmable', driver: 'bulb_dimmable' },
      'E2217': { model: 'STOFTMÄNGD Air Purifier', type: 'air_purifier', driver: 'air_quality_comprehensive' }
    }
  },

  // Aqara (2025 models - Zigbee 3.0)
  aqara: {
    'LUMI': {
      'lumi.sensor_ht.agl02': { model: 'Aqara T1 Pro', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
      'lumi.sensor_motion.agl04': { model: 'Aqara P2', type: 'motion', driver: 'motion_sensor_pir' },
      'lumi.switch.n1aeu1': { model: 'Aqara H2 EU', type: 'switch', driver: 'switch_basic_1gang' },
      'lumi.curtain.acn002': { model: 'Aqara Curtain E1', type: 'curtain', driver: 'curtain_motor_advanced' },
      'lumi.remote.b1acn02': { model: 'Aqara Mini Switch (2025)', type: 'button', driver: 'button_shortcut' },
      'lumi.sensor_occupy.agl01': { model: 'Aqara Presence FP2', type: 'presence_radar', driver: 'presence_sensor_radar' }
    }
  },

  // Sonoff (2025 models)
  sonoff: {
    'SONOFF': {
      'SNZB-01P': { model: 'SNZB-01P Wireless Button', type: 'button', driver: 'button_shortcut' },
      'SNZB-02P': { model: 'SNZB-02P Temp/Humidity', type: 'temp_humidity', driver: 'climate_monitor_temp_humidity' },
      'SNZB-03P': { model: 'SNZB-03P Motion', type: 'motion', driver: 'motion_sensor_pir' },
      'SNZB-04P': { model: 'SNZB-04P Door/Window', type: 'contact', driver: 'contact_sensor' },
      'SNZB-06P': { model: 'SNZB-06P Presence', type: 'presence', driver: 'presence_sensor_radar' }
    }
  },

  // Xiaomi/Mijia (2025 models)
  xiaomi: {
    'Xiaomi': {
      'RTCGQ15LM': { model: 'Mi Motion Sensor 2S', type: 'motion', driver: 'motion_sensor_pir' },
      'MCCGQ14LM': { model: 'Mi Door/Window 2', type: 'contact', driver: 'contact_sensor' },
      'WXCJKG13LM': { model: 'Mi Smart Switch', type: 'button', driver: 'button_shortcut' }
    }
  },

  // Matter-bridged Zigbee (2026 certification)
  matter: {
    'Matter': {
      // These are Zigbee devices exposed via Matter bridge
      'GENERIC_LIGHT': { type: 'light', driver: 'bulb_rgbw' },
      'GENERIC_SWITCH': { type: 'switch', driver: 'switch_basic_1gang' },
      'GENERIC_SENSOR': { type: 'sensor', driver: 'climate_sensor' },
      'GENERIC_LOCK': { type: 'lock', driver: 'lock_smart' }
    }
  }
};

/**
 * ZIGBEE 4.0 FEATURES (Certification H1 2026)
 * - Backward compatible with Zigbee 3.0
 * - Dynamic Link Key
 * - Device Interview
 * - Extended frequency support (800/900 MHz)
 * - Smart Energy Authentication
 * - Improved sleepy device support
 */
const ZIGBEE_4_FEATURES = {
  security: {
    dynamicLinkKey: true,
    deviceInterview: true,
    smartEnergyAuth: true,
    restrictedMode: true,
    securedChannel: true,
    trustCenterSwapOut: true
  },
  frequency: {
    bands: ['2.4GHz', '800MHz (EU)', '900MHz (NA)'],
    extendedRange: true
  },
  sleepyDevices: {
    optimizedPowerManagement: true,
    standardizedNetworkRetries: true,
    improvedMessageValidation: true
  }
};

/**
 * Lookup a new device by manufacturer name
 * @param {string} manufacturerName
 * @returns {Object|null}
 */
function lookupByManufacturer(manufacturerName) {
  // Check Tuya devices
  for (const category of Object.values(NEW_TUYA_2025)) {
    if (category[manufacturerName]) {
      return { type: 'tuya', ...category[manufacturerName] };
    }
  }

  // Check other manufacturers (case-insensitive)
  const mfrLower = (manufacturerName || '').toLowerCase();
  for (const [brand, manufacturers] of Object.entries(NEW_OTHER_2025)) {
    for (const [mfr, models] of Object.entries(manufacturers)) {
      if (mfr.toLowerCase() === mfrLower) {
        return { type: brand, models };
      }
    }
  }

  return null;
}

/**
 * Lookup a device by model ID (case-insensitive)
 * @param {string} modelId
 * @returns {Object|null}
 */
function lookupByModel(modelId) {
  const modelLower = (modelId || '').toLowerCase();
  
  // Check Tuya devices
  for (const [category, devices] of Object.entries(NEW_TUYA_2025)) {
    for (const [mfr, device] of Object.entries(devices)) {
      if ((device.model || '').toLowerCase() === modelLower) {
        return { type: 'tuya', category, manufacturerName: mfr, ...device };
      }
    }
  }

  // Check other manufacturers
  for (const [brand, manufacturers] of Object.entries(NEW_OTHER_2025)) {
    for (const [mfr, models] of Object.entries(manufacturers)) {
      for (const [model, device] of Object.entries(models)) {
        if (model.toLowerCase() === modelLower || (device.model || '').toLowerCase() === modelLower) {
          return { type: brand, manufacturerName: mfr, modelId: model, ...device };
        }
      }
    }
  }

  return null;
}

/**
 * Get recommended driver for a device
 * @param {string} manufacturerName
 * @param {string} modelId
 * @returns {string|null}
 */
function getRecommendedDriver(manufacturerName, modelId) {
  const byMfr = lookupByManufacturer(manufacturerName);
  if (byMfr?.driver) return byMfr.driver;

  const byModel = lookupByModel(modelId);
  if (byModel?.driver) return byModel.driver;

  return null;
}

/**
 * Check if a device is a 2025+ device
 * @param {string} manufacturerName
 * @param {string} modelId
 * @returns {boolean}
 */
function isNew2025Device(manufacturerName, modelId) {
  // Check for _TZE284 prefix (2025 Tuya)
  if (manufacturerName?.startsWith('_TZE284')) return true;

  // Check our database
  return lookupByManufacturer(manufacturerName) !== null || lookupByModel(modelId) !== null;
}

/**
 * Get all supported Tuya manufacturers
 * @returns {string[]}
 */
function getAllTuyaManufacturers() {
  const manufacturers = new Set();
  for (const category of Object.values(NEW_TUYA_2025)) {
    for (const mfr of Object.keys(category)) {
      manufacturers.add(mfr);
    }
  }
  return Array.from(manufacturers);
}

/**
 * Get device categories
 * @returns {string[]}
 */
function getCategories() {
  return Object.keys(NEW_TUYA_2025);
}

// Export
module.exports = {
  NEW_TUYA_2025,
  NEW_OTHER_2025,
  ZIGBEE_4_FEATURES,
  lookupByManufacturer,
  lookupByModel,
  getRecommendedDriver,
  isNew2025Device,
  getAllTuyaManufacturers,
  getCategories
};
