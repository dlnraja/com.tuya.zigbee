const { equalsCI, findCI } = require('./utils/CaseInsensitiveMatcher');

/**
 * DeviceFingerprintDB - v5.12.10
 * 
 * Centralized registry mapping manufacturerName + productId -> device profile
 * Purpose: Eliminate ambiguity when the SAME DP number means different things
 * on different devices (e.g. DP4 = battery on TRV, DP4 = system_mode on thermostat)
 * 
 * LOOKUP PRIORITY:
 *   1. Exact match: manufacturerName + productId (most specific)
 *   2. Manufacturer match: manufacturerName only (fallback to EnrichedDPMappings)
 *   3. ProductId pattern: TS0001->switch_1gang, TS0002->switch_2gang, etc.
 *   4. Default: driver's built-in dpMappings
 * 
 * Sources: Z2M zigbee-herdsman-converters, ZHA quirks, Blakadder DB,
 *          Homey forum reports, GitHub issues, manufacturer docs
 */

// 
// COMPOUND FINGERPRINT DATABASE
// Key: "manufacturerName|productId" -> profile
// 

const ATTRS = {

  // 
  // SWITCHES - ZCL-only (BSEED, Zemismart)
  // 
  '_TZ3000_blhvsaqf|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 1G ZCL-only (GitHub #1339)' },
  '_TZ3000_l9brjwau|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 1G ZCL-only' },
  '_TZ3000_ysdv91bk|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 2G ZCL-only' },
  '_TZ3000_hafsqare|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 3G ZCL-only' },
  '_TZ3000_e98krvvk|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 3G ZCL-only' },
  '_TZ3000_iedbgyxt|TS0004': { driver: 'wall_switch_4gang_1way', protocol: 'zcl', dpProfile, notes: 'BSEED 4G ZCL-only' },
  '_TZ3002_pzao9ls1|TS0726': { driver: 'switch_4gang', protocol: 'zcl', dpProfile, notes: 'BSEED 4G TS0726 broadcast bug - uses writeAttributes (Hartmut_Dunker forum)' },
  'HOBEIAN|ZG-302Z3': { driver: 'switch_3gang', protocol: 'zcl', dpProfile, notes: 'HOBEIAN 3-gang Wall Switch' },


  // 
  // SWITCHES - Tuya DP
  // 
  '_TZE200_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', notes: '2G DP switch' },
  '_TZE204_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', notes: '2G DP switch' },

  // 
  // CLIMATE SENSORS
  // 
  '_TZE200_bjawzodf|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_STANDARD', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE284_vvmbj46n|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_TZE284', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery*2' } },
  '_TZ3000_bgsigers|TS0201': { driver: 'climate_sensor', protocol: 'zcl', dpProfile, notes: 'ZCL sensor stopped working (GitHub #1344) - needs ZCL tempMeasurement+humidity clusters' },

  // 
  // SOIL SENSORS
  // 
  '_TZE284_myd45weu|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity', 5: 'measure_temperature/10', 15: 'measure_battery*2' } },
  '_TZE284_aao3yzhs|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity', 5: 'measure_temperature/10', 15: 'measure_battery*2' }, notes: 'GitHub #1341' },

  // 
  // PRESENCE/RADAR SENSORS
  // 
  '_TZE200_ar0slwnd|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZY_M100', dp: { 1: 'alarm_motion', 104: 'measure_luminance' } },
  '_TZE200_rhgsbacq|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZG_204ZM', dp: { 1: 'alarm_motion', 4: 'measure_battery', 106: 'measure_luminance', 111: 'measure_temperature/10' }, notes: 'GitHub #1343' },
  '_TZE284_bquwrqh1|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'PIR_BRIGHTNESS', notes: 'PIR Motion+Brightness (GitHub #1351)' },

  // 
  // THERMOSTATS / TRV
  // 
  '_TZE200_ckud7u2l|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'system_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_o3x45p96|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'ME167', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 35: 'alarm_battery', 47: 'dim.valve', 104: 'measure_battery' } },
  '_TZE200_b6wax7g0|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'BRT100', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_xnbkhhdr|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD', notes: 'AVATTO WT198 (GitHub #1345)' },

  // 
  // COVERS / CURTAIN MOTORS
  // 
  '_TZE200_cowvfni3|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_STANDARD', dp: { 1: 'windowcoverings_state', 2: 'dim', 5: 'direction', 7: 'work_state' } },
  '_TZE204_xu4a5rhj|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_INVERTED', dp: { 1: 'windowcoverings_state', 2: 'dim_inverted' }, notes: 'Longsam M3 - position inverted (Z2M #26660)' },

  // 
  // AIR QUALITY
  // 
  '_TZE200_8ygsuhe1|TS0601': { driver: 'air_quality_sensor', protocol: 'tuya_dp', dpProfile: 'AIR_QUALITY', dp: { 2: 'measure_co2', 18: 'measure_temperature/10', 19: 'measure_humidity/10', 20: 'measure_pm25', 21: 'measure_voc', 22: 'measure_formaldehyde/100' }, notes: 'Smart Airbox - mains powered, NO battery' },

  // 
  // SCENE SWITCHES / WIRELESS BUTTONS
  // 
  '_TZ3000_kxaow5ki|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', dpProfile, notes: '1-button wireless (GitHub #1352)' },
  '_TZ3000_402vrq2i|TS004F': { driver: 'smart_knob', protocol: 'zcl', dpProfile, notes: 'Smart Knob Dimmer (GitHub #1349)' },

  // 
  // DIMMERS
  // 
  '_TZE204_5cuocqty|TS0601': { driver: 'dimmer_wall_1gang', protocol: 'tuya_dp', dpProfile: 'DIMMER', dp: { 1: 'onoff', 2: 'dim/1000' } },

  // 
  // SAFETY SENSORS
  // 
  '_TZE200_t1blo2bj|TS0601': { driver: 'siren', protocol: 'tuya_dp', dpProfile: 'SIREN_STANDARD', dp: { 1: 'onoff', 5: 'alarm_type', 6: 'alarm_volume', 13: 'measure_battery' } },
};

// 
// PRODUCT ID -> DRIVER TYPE MAPPING (fallback when mfr not in DB)
// 

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
  'TS0601': { driver, type: 'tuya_dp', notes: 'Requires manufacturerName for driver selection' },
  'TS0726': { driver: 'switch_4gang', type: 'switch', notes: 'Multi-gang, check mfr for ZCL-only' },
  'TS110E': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS110F': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS1201': { driver: 'ir_blaster', type: 'ir' },
  'TS130F': { driver: 'curtain_motor', type: 'cover' },
};

// 
// MAIN CLASS
// 

class DeviceFingerprintDB {

  /**
   * Lookup device profile by exact fingerprint (manufacturerName + productId)
   * @param {string} manufacturerName 
   * @param {string} productId 
   * @returns {object|null} Device profile or null
   */
  static lookup(manufacturerName, productId) {
    if (!manufacturerName || !productId) return null;
    
    // Priority 1: Exact compound key
    const key = manufacturerName + '|' + productId;
    const exact = FINGERPRINT_DB[key];
    if (exact) return { ...exact, matchType: 'exact', key };

    // Priority 2: Case-insensitive compound key
    const keyLower = key.toLowerCase();
    for (const [k, v] of Object.entries(FINGERPRINT_DB)) {
      if (k.toLowerCase() === keyLower) return { ...v, matchType: 'exact_ci', key: k };
    }

    // Priority 3: ProductId default (when mfr not in DB) - Case Insensitive
    const pidKey = findCI(Object.keys(PRODUCT_ID_DEFAULTS), productId);
    const pidDefault = pidKey ? PRODUCT_ID_DEFAULTS[pidKey] : null;
    
    if (pidDefault) return { ...pidDefault, matchType: 'productId_default', key: pidKey };

    return null;
  }

  /**
   * Get DP meaning for a specific device + DP number
   * @param {string} manufacturerName 
   * @param {string} productId 
   * @param {number} dpNumber 
   * @returns {object|null} { capability, divisor, notes }
   */
  static getDPMeaning(manufacturerName, productId, dpNumber) {
    const profile = this.lookup(manufacturerName, productId);
    if (!profile?.dp?.[dpNumber]) return null;
    
    const dpStr = profile.dp[dpNumber];
    if (typeof dpStr === 'string') {
      // Parse "capability/divisor" or "capability*multiplier" format
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

  /**
   * Check if a fingerprint has known collisions
   * @param {string} manufacturerName 
   * @param {string} productId 
   * @returns {boolean}
   */
  static hasCollision(manufacturerName, productId) {
    const profile = this.lookup(manufacturerName, productId);
    return profile?.matchType === 'exact' || profile?.matchType === 'exact_ci';}

  /**
   * Get all entries in the database
   * @returns {object}
   */
  static getAll() {
    return { ...FINGERPRINT_DB };
  }

  /**
   * Get database stats
   * @returns {object}
   */
  static getStats() {
    return {
      exactEntries: Object.keys(FINGERPRINT_DB).length,
      productIdDefaults: Object.keys(PRODUCT_ID_DEFAULTS).length,
      totalEntries: Object.keys(FINGERPRINT_DB).length + Object.keys(PRODUCT_ID_DEFAULTS).length,
    };
  }
}

module.exports = DeviceFingerprintDB;
module.exports.FINGERPRINT_DB = FINGERPRINT_DB;
module.exports.PRODUCT_ID_DEFAULTS = PRODUCT_ID_DEFAULTS;



