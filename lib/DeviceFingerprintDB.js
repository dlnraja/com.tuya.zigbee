'use strict';

const { normalize } = require('./utils/CaseInsensitiveMatcher');

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

// ═══════════════════════════════════════════════════════════════════════════
// COMPOUND FINGERPRINT DATABASE
// Key: "manufacturerName|productId" -> profile
// ═══════════════════════════════════════════════════════════════════════════

const FINGERPRINT_DB = {

  // ─────────────────────────────────────────────────────────────────────────
  // SWITCHES - ZCL-only (BSEED, Zemismart)
  // ─────────────────────────────────────────────────────────────────────────
  '_TZ3000_blhvsaqf|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 1G ZCL-only (GitHub #1339)' },
  '_TZ3000_l9brjwau|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 1G ZCL-only' },
  '_TZ3000_ysdv91bk|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 2G ZCL-only' },
  '_TZ3000_hafsqare|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 3G ZCL-only' },
  '_TZ3000_e98krvvk|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 3G ZCL-only' },
  '_TZ3000_iedbgyxt|TS0004': { driver: 'wall_switch_4gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 4G ZCL-only' },
  '_TZ3000_mrduubod|TS0014': { driver: 'wall_switch_4gang_1way', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], powerSource: 'mains', notes: 'Homey forum #2099 / Johan #1413 Moes TS0014 4-gang: ZCL OnOff endpoints with 0xE000/0xE001; Basic may report battery incorrectly' },
  '_TZ3002_pzao9ls1|TS0726': { driver: 'wall_switch_4gang_1way', protocol: 'zcl', dpProfile: null, notes: 'BSEED 4G TS0726 broadcast bug - uses writeAttributes (Hartmut_Dunker forum)' },
  '_TZ3000_ovyaisip|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile: null, notes: 'Johan #1045 NovaDigital 1-gang switch; keep away from climate fallback' },
  '_TZ3000_pk8tgtdb|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', dpProfile: null, notes: 'Johan #1048 1-gang switch; keep away from climate fallback' },
  '_TZ3000_yervjnlj|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile: null, notes: 'Johan #1051 NovaDigital TS0003 switch; keep away from climate fallback' },
  '_TZ3000_eqsair32|TS0003': { driver: 'switch_3gang', protocol: 'zcl', dpProfile: null, notes: 'Johan #1068 Zemismart 3-gang switch' },
  '_TZ3000_qxcnwv26|TS0003': { driver: 'switch_3gang', protocol: 'zcl', dpProfile: null, notes: 'Johan #1058 3-gang switch' },

  // ─────────────────────────────────────────────────────────────────────────
  // SWITCHES - Tuya DP
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', notes: '2G DP switch' },
  '_TZE204_amp6tsvy|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', notes: '2G DP switch' },
  '_TZE204_rzdkn5rx|TS0601': { driver: 'boiler_switch_energy', protocol: 'tuya_dp', dpProfile: 'BOILER_SWITCH_ENERGY', powerSource: 'mains', dp: { 1: 'onoff', 6: 'measure_current', 7: 'measure_power', 8: 'measure_voltage', 9: 'meter_power', 12: 'measure_temperature' }, notes: 'Hubitat Moes/Zemismart wall-switch driver; Homey forum 26439 #5484 Zemismart ZN-LRL1E/boiler switch variant' },
  '_TZE28C100000_rzdkn5rx|TS0601': { driver: 'boiler_switch_energy', protocol: 'tuya_dp', dpProfile: 'BOILER_SWITCH_ENERGY', powerSource: 'mains', dp: { 1: 'onoff', 6: 'measure_current', 7: 'measure_power', 8: 'measure_voltage', 9: 'meter_power', 12: 'measure_temperature' }, notes: 'Homey forum 26439 #5484 exact manufacturer code for Zemismart ZN-LRL1E/30A water boiler switch' },
  '_TZE28C1000000_rzdkn5rx|TS0601': { driver: 'boiler_switch_energy', protocol: 'tuya_dp', dpProfile: 'BOILER_SWITCH_ENERGY', powerSource: 'mains', dp: { 1: 'onoff', 6: 'measure_current', 7: 'measure_power', 8: 'measure_voltage', 9: 'meter_power', 12: 'measure_temperature' }, notes: 'Homey forum 26439 #5484 normalized TZE28C1000000 prefix sibling for Zemismart boiler switch' },

  // ─────────────────────────────────────────────────────────────────────────
  // CLIMATE SENSORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_bjawzodf|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_STANDARD', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery' } },
  '_TZE284_vvmbj46n|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_TZE284', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery*2' } },
  '_TZ3000_bgsigers|TS0201': { driver: 'climate_sensor', protocol: 'zcl', dpProfile: null, notes: 'ZCL sensor stopped working (GitHub #1344) - needs ZCL tempMeasurement+humidity clusters' },
  '_TZE200_cirvgep4|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_CLOCK', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 15: 'measure_battery' }, notes: 'Johan #1066 / Z2M ZTH08-E temp-humidity clock; not air_purifier' },
  '_TZE204_cirvgep4|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_CLOCK', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 15: 'measure_battery' }, notes: 'Z2M ZTH08-E temp-humidity clock; not air_purifier' },

  // ─────────────────────────────────────────────────────────────────────────
  // LIGHT / LUMINANCE SENSORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE284_aaeasoll|TS0601': { driver: 'light_sensor_outdoor', protocol: 'tuya_dp', dpProfile: 'ILLUMINANCE_TUYA', dp: { 1: 'measure_luminance', 4: 'measure_battery' }, notes: 'Homey forum #2080 TS0601 light sensor; keep away from climate_sensor fallback' },

  // ─────────────────────────────────────────────────────────────────────────
  // SOIL SENSORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_myd45weu|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery' }, notes: 'Soil temperature/moisture sensor, Zigbee2MQTT #27346; migrated from legacy soilsensor_2 to enriched soil_sensor' },
  '_TZE204_myd45weu|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery' }, notes: 'Johan #1416 diagnostic context: TZE204 myd45weu soil variant; keep away from air_purifier fallback' },
  '_TZE284_myd45weu|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery' }, notes: 'Homey forum #2097, Zigbee2MQTT #27346; migrated from legacy soilsensor_2 to enriched soil_sensor' },
  '_TZE284_oitavov2|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_ALT', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery', 109: 'measure_humidity' }, notes: 'GitHub #398 QT-07S soil tester; keep away from air_purifier_soil collision' },
  '_TZE284_aao3yzhs|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery*2' }, notes: 'GitHub #1341' },
  '_TZE284_0ints6wl|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_STANDARD', dp: { 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 15: 'measure_battery' }, notes: 'GitHub #428 solid moisture sensor' },
  '_TZE200_npj9bug3|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL_NPJ9BUG3', dp: { 5: 'measure_temperature/10', 15: 'measure_battery', 111: 'measure_humidity.soil' }, notes: 'Homey forum #2091 soil sensor; keep away from curtain/climate fallbacks' },

  // ─────────────────────────────────────────────────────────────────────────
  // PRESENCE/RADAR SENSORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_ar0slwnd|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZY_M100', dp: { 1: 'alarm_motion', 104: 'measure_luminance' } },
  '_TZE200_rhgsbacq|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'ZG_204ZM', dp: { 1: 'alarm_motion', 4: 'measure_battery', 106: 'measure_luminance', 111: 'measure_temperature/10' }, notes: 'GitHub #1343' },
  '_TZE284_bquwrqh1|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'PIR_BRIGHTNESS', notes: 'PIR Motion+Brightness (GitHub #1351)' },

  // ─────────────────────────────────────────────────────────────────────────
  // THERMOSTATS / TRV
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_ckud7u2l|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'system_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_o3x45p96|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'ME167', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 35: 'alarm_battery', 47: 'dim.valve', 104: 'measure_battery' } },
  '_TZE200_b6wax7g0|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'BRT100', dp: { 2: 'target_temperature/10', 3: 'measure_temperature/10', 4: 'thermostat_mode', 13: 'measure_battery', 14: 'dim.valve' } },
  '_TZE284_xnbkhhdr|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV_STANDARD', notes: 'AVATTO WT198 (GitHub #1345)' },
  '_TZE284_ne4pikwm|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'NEDIS_TRV', dp: { 1: 'onoff', 2: 'thermostat_mode', 16: 'target_temperature/10', 24: 'measure_temperature/10', 40: 'child_lock' }, notes: 'Homey forum #2081 Nedis radiator valve - must not route to climate_sensor' },
  '_TZE200_ne4pikwm|TS0601': { driver: 'radiator_valve', protocol: 'tuya_dp', dpProfile: 'NEDIS_TRV', dp: { 1: 'onoff', 2: 'thermostat_mode', 16: 'target_temperature/10', 24: 'measure_temperature/10', 40: 'child_lock' }, notes: 'Nedis/ne4pikwm compatible radiator valve variant' },

  // ─────────────────────────────────────────────────────────────────────────
  // IRRIGATION VALVES
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE284_fhvpaltk|TS0601': { driver: 'valve_dual_irrigation', protocol: 'tuya_dp', dpProfile: 'INSOMA_DUAL_IRRIGATION', dp: { 1: 'onoff.valve_1', 2: 'onoff.valve_2', 15: 'measure_battery', 59: 'measure_battery', 101: 'measure_battery' }, notes: 'Homey forum #2082 Insoma 2-way valve; not curtain_motor or 4-way dim valve' },
  '_TZE284_eaet5qt5|TS0601': { driver: 'valve_dual_irrigation', protocol: 'tuya_dp', dpProfile: 'INSOMA_DUAL_IRRIGATION', dp: { 1: 'onoff.valve_1', 2: 'onoff.valve_2', 15: 'measure_battery', 59: 'measure_battery', 101: 'measure_battery' }, notes: 'Insoma 2-way valve variant; not curtain_motor or 4-way dim valve' },

  // ─────────────────────────────────────────────────────────────────────────
  // COVERS / CURTAIN MOTORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_cowvfni3|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_STANDARD', dp: { 1: 'windowcoverings_state', 2: 'dim', 5: 'direction', 7: 'work_state' } },
  '_TZE204_xu4a5rhj|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', dpProfile: 'COVER_INVERTED', dp: { 1: 'windowcoverings_state', 2: 'dim_inverted' }, notes: 'Longsam M3 - position inverted (Z2M #26660)' },
  '_TZE204_r0jdjrvi|TS0601': { driver: 'curtain_motor_tilt', protocol: 'tuya_dp', dpProfile: 'COVER_STANDARD', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set' }, notes: 'Johan #1374 TZE204 variant of r0jdjrvi curtain motor; not presence radar' },

  // ─────────────────────────────────────────────────────────────────────────
  // AIR QUALITY
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_8ygsuhe1|TS0601': { driver: 'air_quality_comprehensive', protocol: 'tuya_dp', dpProfile: 'AIR_QUALITY', dp: { 2: 'measure_co2', 18: 'measure_temperature/10', 19: 'measure_humidity/10', 20: 'measure_pm25', 21: 'measure_voc', 22: 'measure_formaldehyde/100' }, notes: 'Smart Airbox - mains powered, NO battery' },

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE SWITCHES / WIRELESS BUTTONS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZ3000_kxaow5ki|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', dpProfile: null, notes: '1-button wireless (GitHub #1352)' },
  '_TZ3000_u3nv1jwk|TS0044': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Homey forum TS0044 4-button remote, E000/DP action path' },
  '_TZ3000_u3nv1jwk|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Homey forum TS004F-compatible 4-button remote, E000/DP action path' },
  '_TZ3000_kfu8zapd|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/Hubitat' },
  '_TZ3000_xabckq1v|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_czuyt8lz|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_b3mgfu0d|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA' },
  '_TZ3000_rco1yzb1|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Lidl/Moes TS004F remote using OnOff/LevelControl action clusters' },
  '_TZ3000_abrsvsou|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_4fjiwweb|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_402vrq2i|TS004F': { driver: 'smart_knob', protocol: 'zcl', dpProfile: null, notes: 'Smart Knob Dimmer (GitHub #1349)' },
  '_TZ3000_kaflzta4|TS004F': { driver: 'smart_knob', protocol: 'zcl', dpProfile: null, notes: 'Johan #1365 one-endpoint TS004F scene button; not climate or 4-button remote' },
  '_TZ3000_qja6nq5z|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob; keep away from generic 4-button remotes' },
  '_TZ3000_gwkzibhs|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob; keep away from generic 4-button remotes' },
  '_TZ3000_ugi8ky6u|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob variant' },

  // ─────────────────────────────────────────────────────────────────────────
  // DIMMERS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE204_5cuocqty|TS0601': { driver: 'dimmer_wall_1gang', protocol: 'tuya_dp', dpProfile: 'DIMMER', dp: { 1: 'onoff', 2: 'dim/1000' } },

  // ─────────────────────────────────────────────────────────────────────────
  // SAFETY SENSORS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE200_t1blo2bj|TS0601': { driver: 'siren', protocol: 'tuya_dp', dpProfile: 'SIREN_STANDARD', dp: { 1: 'onoff', 5: 'alarm_type', 6: 'alarm_volume', 13: 'measure_battery' } },
  '_TZE204_q76rtoa9|TS0601': { driver: 'siren', protocol: 'tuya_dp', dpProfile: 'SIREN_STANDARD', notes: 'Johan #1046 TS0601 siren' },
  '_TZE200_lvkk0hdg|TS0601': { driver: 'water_tank_monitor', protocol: 'tuya_dp', dpProfile: 'WATER_TANK', dp: { 1: 'measure_water_level', 2: 'measure_water_percentage', 15: 'measure_battery' }, notes: 'Johan #1050 EPT Tech water level monitor; not generic DIY/Tuya' },
  'HOBEIAN|ZG-222Z': { driver: 'water_leak_sensor', protocol: 'ias_zone', dpProfile: null, notes: 'Homey forum #2090 HOBEIAN water detector with IAS Zone; not rain_sensor' },
  'eWeLink|SNZB-03': { driver: 'motion_sensor', protocol: 'zcl', dpProfile: null, notes: 'Homey forum #2086/#2088 Sonoff/eWeLink motion sensor fallback' },
};

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT ID -> DRIVER TYPE MAPPING (fallback when mfr not in DB)
// ═══════════════════════════════════════════════════════════════════════════

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
  'SNZB-03': { driver: 'motion_sensor', type: 'sensor' },
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
  'TS0601': { driver: null, type: 'tuya_dp', notes: 'Requires manufacturerName for driver selection' },
  'TS0726': { driver: 'switch_4gang', type: 'switch', notes: 'Multi-gang, check mfr for ZCL-only' },
  'TS110E': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS110F': { driver: 'dimmer_wall_1gang', type: 'dimmer' },
  'TS130F': { driver: 'curtain_motor', type: 'cover' },
  'ZG-222Z': { driver: 'water_leak_sensor', type: 'sensor' },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════

class DeviceFingerprintDB {

  /**
   * Lookup device profile by exact fingerprint (manufacturerName + productId)
   * @param {string} manufacturerName 
   * @param {string} productId 
   * @returns {object|null} Device profile or null
   */
  static lookup(manufacturerName, productId) {
    if (!manufacturerName || !productId) {return null;}
    
    // Priority 1: Exact compound key
    const key = `${manufacturerName  }|${  productId}`;
    const exact = FINGERPRINT_DB[key];
    if (exact) {return { ...exact, matchType: 'exact', key };}

    // Priority 2: Case-insensitive compound key
    const keyLower = normalize(key);
    for (const [k, v] of Object.entries(FINGERPRINT_DB)) {
      if (normalize(k) === keyLower) {return { ...v, matchType: 'exact_ci', key: k };}
    }

    // Priority 3: ProductId default (when mfr not in DB)
    const pidDefault = PRODUCT_ID_DEFAULTS[productId];
    if (pidDefault) {return { ...pidDefault, matchType: 'productId_default', key: productId };}

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
    if (!profile?.dp?.[dpNumber]) {return null;}
    
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
    return profile?.matchType === 'exact' || profile?.matchType === 'exact_ci';
  }

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
