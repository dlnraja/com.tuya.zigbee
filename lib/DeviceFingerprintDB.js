const fs = require('fs');
const path = require('path');
const { normalize } = require('./utils/CaseInsensitiveMatcher');

/**
 * DeviceFingerprintDB - v6.0.0
 * 
 * Centralized registry mapping manufacturerName + productId -> device profile
 * Optimized for O(1) lookup using a Map index.
 */

let FINGERPRINT_INDEX = new Map();
let PRODUCT_ID_INDEX = new Map();

// Initial hardcoded values (seed)
const SEED_DATA = {
  '_TZ3000_blhvsaqf|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl' },
  '_TZ3000_l9brjwau|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl' },
  '_TZ3000_ysdv91bk|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl' },
  '_TZ3000_hafsqare|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl' },
  '_TZ3000_e98krvvk|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl' },
  '_TZ3000_iedbgyxt|TS0004': { driver: 'wall_switch_4gang_1way', protocol: 'zcl' },
  '_TZ3002_pzao9ls1|TS0726': { driver: 'switch_4gang', protocol: 'zcl' },
  'HOBEIAN|ZG-302Z3': { driver: 'switch_3gang', protocol: 'zcl' },
  '_TZE200_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG' },
  '_TZE204_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG' },
  '_TZE200_bjawzodf|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_STANDARD', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE284_vvmbj46n|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_TZE284', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery*2' } },
  '_TZ3000_bgsigers|TS0201': { driver: 'climate_sensor', protocol: 'zcl' },
  '_TZE284_myd45weu|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity', 5: 'measure_temperature/10', 15: 'measure_battery*2' } },
  '_TZE284_aao3yzhs|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity', 5: 'measure_temperature/10', 15: 'measure_battery*2' } },
  '_TZE200_ar0slwnd|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZY_M100', dp: { 1: 'alarm_motion', 104: 'measure_luminance' } },
  '_TZE200_rhgsbacq|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZG_204ZM', dp: { 1: 'alarm_motion', 4: 'measure_battery', 106: 'measure_luminance', 111: 'measure_temperature/10' } },
  '_TZE284_bquwrqh1|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'PIR_BRIGHTNESS' },
  '_TZE200_ckud7u2l|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'system_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_o3x45p96|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'ME167', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 35: 'alarm_battery', 47: 'dim.valve', 104: 'measure_battery' } },
  '_TZE200_b6wax7g0|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'BRT100', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_xnbkhhdr|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD' },
  '_TZE200_cowvfni3|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_STANDARD', dp: { 1: 'windowcoverings_state', 2: 'dim', 5: 'direction', 7: 'work_state' } },
  '_TZE204_xu4a5rhj|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_INVERTED', dp: { 1: 'windowcoverings_state', 2: 'dim_inverted' } },
  '_TZE200_8ygsuhe1|TS0601': { driver: 'air_quality_sensor', protocol: 'tuya_dp', dpProfile: 'AIR_QUALITY', dp: { 2: 'measure_co2', 18: 'measure_temperature/10', 19: 'measure_humidity/10', 20: 'measure_pm25', 21: 'measure_voc', 22: 'measure_formaldehyde/100' } },
  '_TZ3000_kxaow5ki|TS0041': { driver: 'button_wireless_1', protocol: 'zcl' },
  '_TZ3000_402vrq2i|TS004F': { driver: 'smart_knob', protocol: 'zcl' },
  '_TZE204_5cuocqty|TS0601': { driver: 'dimmer_wall_1gang', protocol: 'tuya_dp', dpProfile: 'DIMMER', dp: { 1: 'onoff', 2: 'dim/1000' } },
  '_TZE200_t1blo2bj|TS0601': { driver: 'siren', protocol: 'tuya_dp', dpProfile: 'SIREN_STANDARD', dp: { 1: 'onoff', 5: 'alarm_type', 6: 'alarm_volume', 13: 'measure_battery' } },
};

const PRODUCT_ID_DEFAULTS = {
  'TS0001': { driver: 'switch_1gang', gangCount: 1 },
  'TS0002': { driver: 'switch_2gang', gangCount: 2 },
  'TS0003': { driver: 'switch_3gang', gangCount: 3 },
  'TS0004': { driver: 'switch_4gang', gangCount: 4 },
  'TS0011': { driver: 'switch_1gang', gangCount: 1 },
  'TS0012': { driver: 'switch_2gang', gangCount: 2 },
  'TS0013': { driver: 'switch_3gang', gangCount: 3 },
  'TS0014': { driver: 'switch_4gang', gangCount: 4 },
  'TS0041': { driver: 'button_wireless_1', type: 'button' },
  'TS0042': { driver: 'button_wireless_2', type: 'button' },
  'TS0043': { driver: 'button_wireless_3', type: 'button' },
  'TS0044': { driver: 'button_wireless_4', type: 'button' },
  'TS004F': { driver: 'smart_knob', type: 'rotary' },
  'TS0101': { driver: 'curtain_motor', type: 'cover' },
  'TS011F': { driver: 'plug_energy_monitor', type: 'plug' },
  'TS0121': { driver: 'plug_energy_monitor', type: 'plug' },
  'TS0201': { driver: 'climate_sensor', type: 'sensor' },
  'TS0202': { driver: 'motion_sensor', type: 'sensor' },
  'TS0203': { driver: 'water_leak_sensor', type: 'sensor' },
  'TS0205': { driver: 'smoke_sensor', type: 'sensor' },
  'TS0207': { driver: 'rain_sensor', type: 'sensor' },
  'TS0210': { driver: 'vibration_sensor', type: 'sensor' },
  'TS0215A': { driver: 'button_emergency_sos', type: 'button' },
  'TS0222': { driver: 'illuminance_sensor', type: 'sensor' },
  'TS0225': { driver: 'presence_sensor_radar', type: 'sensor' },
  'TS0501A': { driver: 'bulb_dimmable', type: 'light' },
  'TS0502A': { driver: 'bulb_ct', type: 'light' },
  'TS0503A': { driver: 'bulb_rgb', type: 'light' },
  'TS0504A': { driver: 'bulb_rgbw', type: 'light' },
  'TS0505A': { driver: 'bulb_rgbw', type: 'light' },
  'TS0505B': { driver: 'bulb_rgbw', type: 'light' },
  'TS0601': { type: 'tuya_dp' },
  'TS0726': { driver: 'switch_4gang', type: 'switch' },
  'TS110E': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS110F': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS1201': { driver: 'ir_blaster', type: 'ir' },
  'TS130F': { driver: 'curtain_motor', type: 'cover' },
};

class DeviceFingerprintDB {
  static init() {
    FINGERPRINT_INDEX.clear();
    PRODUCT_ID_INDEX.clear();

    // 1. Load Defaults
    for (const [id, data] of Object.entries(PRODUCT_ID_DEFAULTS)) {
      PRODUCT_ID_INDEX.set(normalize(id), data);
    }

    // 2. Load Seed Data
    for (const [key, data] of Object.entries(SEED_DATA)) {
      FINGERPRINT_INDEX.set(normalize(key), data);
    }

    // 3. Load External Fingerprints
    try {
      const externalPath = path.join(__dirname, '../data/fingerprints.json');
      if (fs.existsSync(externalPath)) {
        const external = JSON.parse(fs.readFileSync(externalPath, 'utf8'));
        for (const [key, data] of Object.entries(external)) {
          FINGERPRINT_INDEX.set(normalize(key), data);
        }
      }
    } catch (e) {
      console.error('[FingerprintDB] Failed to load external fingerprints:', e.message);
    }
  }

  static lookup(manufacturerName, productId) {
    if (!manufacturerName || !productId) return null;
    
    if (FINGERPRINT_INDEX.size === 0) this.init();

    const key = normalize(`${manufacturerName}|${productId}`);
    const match = FINGERPRINT_INDEX.get(key);
    if (match) return { ...match, matchType: 'exact', key };

    const pidKey = normalize(productId);
    const pidMatch = PRODUCT_ID_INDEX.get(pidKey);
    if (pidMatch) return { ...pidMatch, matchType: 'productId_default', key: pidKey };

    return null;
  }

  static getDPMeaning(manufacturerName, productId, dpNumber) {
    const profile = this.lookup(manufacturerName, productId);
    if (!profile?.dp?.[dpNumber]) return null;
    
    const dpStr = profile.dp[dpNumber];
    if (typeof dpStr === 'string') {
      const parts = dpStr.split('/');
      if (parts.length === 2) {
        return { capability: parts[0], divisor: parseInt(parts[1]), multiplier: 1 };
      }
      const mparts = dpStr.split('*');
      if (mparts.length === 2) {
        return { capability: mparts[0], divisor: 1, multiplier: parseInt(mparts[1]) };
      }
      return { capability: dpStr, divisor: 1, multiplier: 1 };
    }
    return dpStr;
  }

  static getAll() {
    return Object.fromEntries(FINGERPRINT_INDEX);
  }

  static getStats() {
    return {
      exactEntries: FINGERPRINT_INDEX.size,
      productIdDefaults: PRODUCT_ID_INDEX.size,
      totalEntries: FINGERPRINT_INDEX.size + PRODUCT_ID_INDEX.size,
    };
  }
}

// Auto-initialize
DeviceFingerprintDB.init();

module.exports = DeviceFingerprintDB;
