'use strict';

const { normalize } = require('./utils/CaseInsensitiveMatcher');
const FingerprintMatcher = require('./utils/fingerprint-matcher');

// P92: heuristic matching can be disabled (TUYA_FP_HEURISTIC=0) to fall back
// to the pre-P92 exact/case-insensitive behavior.
const HEURISTIC_ENABLED = process.env.TUYA_FP_HEURISTIC !== '0';

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

  // Exact routes verified against the driver's declared product IDs. Keep
  // these compound keys ahead of the broad manufacturer-only catalog.
  '_TZE284_sgabhwa6|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  // Forum #1610 — HOBEIAN/Tuya rain sensor (Z2M ZG-223Z), not contact
  '_TZE200_u6x1zyv2|TS0601': { driver: 'rain_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZE204_u6x1zyv2|TS0601': { driver: 'rain_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZE284_u6x1zyv2|TS0601': { driver: 'rain_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  // Forum #2135 / Z2M #32305 — Avatto ZDMS16-2 2ch dimmer (MCU brightness clamp 0-1000)
  '_TZE204_jtbgusdc|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE284_jtbgusdc|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE200_jtbgusdc|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE28C1000000_jtbgusdc|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE204_o9gyszw2|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE284_o9gyszw2|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE28C1000000_o9gyszw2|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE204_fjms2pi9|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE284_fjms2pi9|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE28C1000000_fjms2pi9|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE200_jthf7vb6|TS0601': { driver: 'water_leak_sensor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'alarm_water' } },
  '_TZE200_ntcy3xu1|TS0601': { driver: 'smoke_detector_advanced', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3290_j37rooaxrcdcqo5n|TS1201': { driver: 'ir_blaster', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_qaaysllp|TS0201': { driver: 'lcdtemphumidluxsensor', protocol: 'zcl', powerSource: 'battery' },
  '_TZE200_locansqn|TS0601': { driver: 'lcdtemphumidsensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZE200_pay2byax|TS0601': { driver: 'contact_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZE200_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZE204_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZE284_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZ3000_iol4bl2y|TS0003': { driver: 'switch_3gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3] },
  '_TZ3000_wzmuk9ai|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_ww6drja5|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_46t1rvdu|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_b4awzgct|TS0041': { driver: 'button_wireless_4_ts0041', protocol: 'zcl', powerSource: 'battery', endpoints: [1, 2, 3, 4] },
  '_TZ3000_18ejxno0|TS0002': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2] },
  '_TZ3000_18ejxno0|TS0012': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2] },
  '_TZ3000_18ejxno0|TS1101': { driver: 'bulb_dimmable_dimmer', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_18ejxno0|TS110E': { driver: 'bulb_dimmable_dimmer', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_18ejxno0|TS110F': { driver: 'bulb_dimmable_dimmer', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_18ejxno0|TS0052': { driver: 'bulb_dimmable_dimmer', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_18ejxno0|TS0042': { driver: 'button_wireless_2', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3000_18ejxno0|TS0043': { driver: 'button_wireless_3', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3000_a7ouggvs|TS0043': { driver: 'button_wireless_3', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3000_qzjcsmar|TS0043': { driver: 'button_wireless_3', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3000_vd43bbfq|TS130F': { driver: 'curtain_module', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_fdxihpp7|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3002_fdxihpp7|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_skueekg3|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_0t4zjtia|TS0001': { driver: 'wall_switch_1gang_1way', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_akqdg6g7|TS0201': { driver: 'climate_sensor', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3210_j4pdtz9v|TS0001': { driver: 'fingerbot', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3210_dse8ogfy|TS0001': { driver: 'fingerbot', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3210_232nryqh|TS0001': { driver: 'fingerbot', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3210_okbss9dy|TS0001': { driver: 'fingerbot', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3000_ruldv5dt|TS0002': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2] },
  '_TZ3000_6l1pjfqe|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_88iqnhvd|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_5ct6e7ye|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_7ysdnebc|TS1101': { driver: 'dimmer_dual_channel', protocol: 'zcl', powerSource: 'mains' },
  '_TZE200_d0yu2xgi|TS0601': { driver: 'siren_sirentemphumidsensor', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TYST11_d0yu2xgi|TS0601': { driver: 'siren_sirentemphumidsensor', protocol: 'tuya_dp', powerSource: 'mains' },

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
  '_TZ3000_eqsair32|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile: null, notes: 'Johan #1068 Zemismart TB25-3; sub-device tiles' },
  '_TZ3000_qxcnwv26|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', dpProfile: null, notes: 'Johan #1058 TB25-3; sub-device tiles' },
  '_TZ3000_fawk5xjv|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3], notes: 'TB25-3 ZCL; TZ3000 only (TZ3210 stays 1-gang/unconfirmed)' },
  '_TZ3000_jjdkhueq|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2], notes: 'NovaDigital/Zemismart 2-gang; sub-device tiles; keep off switch_2gang catch-all' },
  '_TZ3000_ywubfuvt|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2], notes: 'NovaDigital/Zemismart 2-gang; sub-device tiles' },
  '_TZ3000_kgxej1dv|TS0002': { driver: 'wall_switch_2gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2], notes: 'NovaDigital/Zemismart 2-gang; sub-device tiles' },
  '_TZ3000_lwthnp7j|TS0004': { driver: 'wall_switch_4gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3, 4], notes: 'Zemismart TB25-4 ZCL; sub-device tiles; not EF00 TS0601' },
  '_TZ3218_7fiyo3kv|TS000F': { driver: 'switch_temp_sensor', protocol: 'hybrid', powerSource: 'mains', dp: { 102: 'measure_temperature/10' }, notes: 'Mumubiz/MHCOZY TYZGTH1CH-D1RF: ZCL onoff + EF00 DP102 temp; never switch_1gang' },
  '_TZ3218_ya5d6wth|TS000F': { driver: 'switch_temp_sensor', protocol: 'hybrid', powerSource: 'mains', dp: { 102: 'measure_temperature/10' }, notes: 'MHCOZY TYZGTH16A TS000F sibling; ZCL onoff + EF00 temp' },
  '_TZ3000_cfnprab5|TS011F': { driver: 'socket_power_strip_four_three', protocol: 'zcl', powerSource: 'mains', notes: '4+USB strip; never a TS0042 remote' },
  '_TZ3000_bczr4e10|TS0043': { driver: 'button_wireless_3', protocol: 'zcl', powerSource: 'battery', endpoints: [1, 2, 3, 4], notes: 'INT-170: 4 OnOff EPs but TS0043 remote — never switch_4gang' },
  '_TZ3000_ok0ggpk7|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3], notes: 'NovaDigital NFZB-03 / TB25-3; sub-device tiles; not 1-gang' },
  '_TZ3000_f09j9qjb|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3], notes: 'TB25-3 ZCL; not 2-gang or climate' },
  '_TZ3000_vjhcenzo|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3], notes: 'TB25-3 ZCL; not climate' },
  '_TZE200_shkxsgis|TS0601': { driver: 'wall_switch_4_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains', notes: '4-gang EF00 DP1-4; not din-rail/climate' },
  '_TZE204_shkxsgis|TS0601': { driver: 'wall_switch_4_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains' },
  '_TZE284_shkxsgis|TS0601': { driver: 'wall_switch_4_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains' },
  '_TZE204_aagrxlbd|TS0601': { driver: 'wall_switch_4_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains', notes: 'NovaDigital TB26-4; not climate' },
  '_TZE284_aagrxlbd|TS0601': { driver: 'wall_switch_4_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains' },
  '_TZE200_r731zlxk|TS0601': { driver: 'wall_switch_6_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains', notes: 'Zemismart 6-gang EF00 DP1-6; not climate' },
  '_TZE204_r731zlxk|TS0601': { driver: 'wall_switch_6_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains' },
  '_TZE284_r731zlxk|TS0601': { driver: 'wall_switch_6_gang_tuya', protocol: 'tuya_dp', dpProfile: 'MULTIGANG', powerSource: 'mains' },

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
  '_TZE200_vvmbj46n|TS0601': { driver: 'lcdtemphumidsensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_TZE284', powerSource: 'battery', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery*2' } },
  '_TZE284_vvmbj46n|TS0601': { driver: 'lcdtemphumidsensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_TZE284', powerSource: 'battery', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 4: 'measure_battery*2' } },
  '_TZ3000_bgsigers|TS0201': { driver: 'climate_sensor', protocol: 'zcl', dpProfile: null, notes: 'ZCL sensor stopped working (GitHub #1344) - needs ZCL tempMeasurement+humidity clusters' },
  '_TZE200_cirvgep4|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_CLOCK', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 15: 'measure_battery' }, notes: 'Johan #1066 / Z2M ZTH08-E temp-humidity clock; not air_purifier' },
  '_TZE204_cirvgep4|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', dpProfile: 'CLIMATE_CLOCK', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 15: 'measure_battery' }, notes: 'Z2M ZTH08-E temp-humidity clock; not air_purifier' },
  '_TZE284_hodyryli|TS0601': { driver: 'climate_sensor_zt08', protocol: 'tuya_dp', dpProfile: 'CLIMATE_ZT08', powerSource: 'battery', dp: { 1: 'measure_temperature/10', 2: 'measure_humidity', 3: 'measure_battery', 38: 'measure_temperature.probe/10' }, notes: 'GH #513 ZT08: DP3 battery_state 0/1/2, DP38 probe ×10' },
  '_TZE284_hodyryli|TS0201': { driver: 'climate_sensor_zt08', protocol: 'zcl', powerSource: 'battery', notes: 'GitHub #513 ZCL fallback for hodyryli variant' },

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
  '_TZE200_8ygsuhe1|TS0601': { driver: 'air_quality_comprehensive', protocol: 'tuya_dp', dpProfile: 'AIR_QUALITY', powerSource: 'mains', dp: { 2: 'measure_co2', 18: 'measure_temperature/10', 19: 'measure_humidity/10', 21: 'measure_voc', 22: 'measure_formaldehyde/100' }, notes: 'Smart Airbox mains profile without battery or particulate capabilities' },

  // ─────────────────────────────────────────────────────────────────────────
  // SCENE SWITCHES / WIRELESS BUTTONS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZ3000_kxaow5ki|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', dpProfile: null, notes: '1-button wireless (GitHub #1352)' },
  '_TZ3000_u3nv1jwk|TS0044': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Homey forum TS0044 4-button remote, E000/DP action path' },
  '_TZ3000_u3nv1jwk|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Homey forum TS004F-compatible 4-button remote, E000/DP action path' },
  '_TZ3000_kfu8zapd|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/Hubitat' },
  '_TZ3000_kfu8zapd|TS0044': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS0044 4-button scene remote (forum #2098-#2104, JohanBendz #1418), OnOff 0xFD action path, no scenes cluster' },
  '_TZ3000_xabckq1v|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_czuyt8lz|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_b3mgfu0d|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA' },
  '_TZ3000_rco1yzb1|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Lidl/Moes TS004F remote using OnOff/LevelControl action clusters' },
  '_TZ3000_abrsvsou|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_4fjiwweb|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_402vrq2i|TS004F': { driver: 'smart_knob', protocol: 'zcl', dpProfile: null, notes: 'Smart Knob Dimmer (GitHub #1349)' },
  '_TZ3000_kaflzta4|TS004F': { driver: 'smart_knob', protocol: 'zcl', dpProfile: null, notes: 'Johan #1365 one-endpoint TS004F scene button; not climate or 4-button remote' },
  '_TZ3000_qja6nq5z|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob; keep away from generic 4-button remotes' },
  // P217 fork harvest (JohanBendz PR #1437 onesilop) — dual TS011F outlet, no metering
  '_TZ3000_k6fvknrr|TS011F': { driver: 'double_power_point_2', protocol: 'zcl', dpProfile: null, notes: '2-endpoint on/off TS011F; not switch_1gang and not energy plug' },
  // P217 fork harvest (JohanBendz #1442 LoraTap) — garage opener, not wireless plug
  '_TZE200_wfxuhoea|TS0601': { driver: 'garage_door', protocol: 'tuya_dp', dpProfile: 'GARAGE', dp: { 1: 'command', 2: 'garagedoor_closed' }, notes: 'LoraTap garage; never button_wireless_plug' },
  '_TZE204_wfxuhoea|TS0601': { driver: 'garage_door', protocol: 'tuya_dp', dpProfile: 'GARAGE', dp: { 1: 'command', 2: 'garagedoor_closed' } },
  // P217 fork harvest (Diddern PR #1439) — Wing brand reports plain manufacturerName
  'Wing|TS0203': { driver: 'contact_sensor', protocol: 'zcl', dpProfile: null, notes: 'Wing TS0203 door/window; not water leak' },
  'Wing|ZTH11-3.0': { driver: 'climate_sensor', protocol: 'zcl', dpProfile: null, notes: 'Wing ZTH11-3.0 temp/humidity (Johan #1429)' },
  'Wing|ZTH13-3.0': { driver: 'climate_sensor', protocol: 'zcl', dpProfile: null, notes: 'Wing ZTH13-3.0 temp/humidity (Johan #1422)' },
  // P217 fork harvest (map1981 PR #1435) — HOBEIAN dual USB-C on/off, unique pid
  'HOBEIAN|ZG-305Z': { driver: 'switch_2gang', protocol: 'zcl', dpProfile: null, notes: 'MHCOZY/HOBEIAN 2ch USB switch; not wireless button' },
  'Zbeacon|TS011F': { driver: 'plug_smart', protocol: 'zcl', dpProfile: null, notes: 'ErnieV PR #1421 Zbeacon TS011F plug scaling' },
  '_TZ3000_gwkzibhs|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob; keep away from generic 4-button remotes' },
  '_TZ3000_ugi8ky6u|TS004F': { driver: 'smart_knob_rotary', protocol: 'zcl', dpProfile: null, notes: 'TS004F rotary knob variant' },

  // ─────────────────────────────────────────────────────────────────────────
  // DIMMERS
  // ─────────────────────────────────────────────────────────────────────────
  '_TZE204_5cuocqty|TS0601': { driver: 'dimmer_wall_1gang', protocol: 'tuya_dp', dpProfile: 'DIMMER', dp: { 1: 'onoff', 2: 'dim/1000' } },
  // BSEED Click socket-insert 1-gang EF00 dimmer (Z2M TS0601_dimmer_1_gang_1)
  '_TZE284_m1cvyneb|TS0601': { driver: 'wall_dimmer_tuya', protocol: 'tuya_dp', dpProfile: 'DIMMER', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000' }, notes: 'Not climate/soil/universal; MCU brightness 0-1000' },
  '_TZE204_m1cvyneb|TS0601': { driver: 'wall_dimmer_tuya', protocol: 'tuya_dp', dpProfile: 'DIMMER', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000' } },
  '_TZE200_m1cvyneb|TS0601': { driver: 'wall_dimmer_tuya', protocol: 'tuya_dp', dpProfile: 'DIMMER', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000' } },

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
  'TS0201': { driver: null, type: 'sensor', notes: 'Requires manufacturerName — one mfr can be climate OR lux OR other; never invent couple' },
  'TS0202': { driver: 'motion_sensor', type: 'sensor' },
  'TS0203': { driver: 'contact_sensor', type: 'sensor', notes: 'Tuya door/window; never invent water-leak from pid alone' },
  'ZG-305Z': { driver: 'switch_2gang', type: 'switch', notes: 'HOBEIAN/MHCOZY 2-channel USB switch (Johan PR #1435)' },
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

    // Priority 2.5 (P92): Heuristic compound key — interchangeable TZE
    // prefixes (_TZE200/_TZE204/_TZE284/_TYST11) and fuzzy suffix (edit
    // distance <= 2). Same productId required; exact/case-insensitive
    // paths above always win first.
    if (HEURISTIC_ENABLED) {
      const heuristic = this._heuristicLookup(manufacturerName, productId);
      if (heuristic) {return heuristic;}
    }

    // Priority 3: ProductId default (when mfr not in DB)
    const pidDefault = PRODUCT_ID_DEFAULTS[productId];
    if (pidDefault) {return { ...pidDefault, matchType: 'productId_default', key: productId };}

    return null;
  }

  /**
   * Heuristic compound lookup (P92): match the manufacturer part of compound
   * keys sharing the same productId via fingerprint-matcher (prefix variants,
   * fuzzy suffix). Returns null below the acceptance threshold.
   * @param {string} manufacturerName
   * @param {string} productId
   * @returns {object|null}
   */
  static _heuristicLookup(manufacturerName, productId) {
    const npid = FingerprintMatcher.normalizePid(productId);
    if (!npid) {return null;}

    // Candidate mfr parts restricted to keys with the same productId
    const candidates = {};
    for (const k of Object.keys(FINGERPRINT_DB)) {
      const sep = k.lastIndexOf('|');
      if (sep === -1) {continue;}
      if (FingerprintMatcher.normalizePid(k.substring(sep + 1)) !== npid) {continue;}
      candidates[k.substring(0, sep)] = k;
    }

    // Pass productId so misattribution registry / mfr-only forces cannot
    // claim an unverified pid (one mfr → many devices).
    const match = FingerprintMatcher.matchFingerprint(manufacturerName, productId, candidates);
    if (!match) {return null;}

    // candidates map values are compound keys (strings). Registry force returns
    // an object entry — reject anything that is not a FINGERPRINT_DB key.
    const compoundKey = typeof match.entry === 'string'
      ? match.entry
      : (typeof match.key === 'string' && typeof candidates[match.key] === 'string'
        ? candidates[match.key]
        : null);
    if (!compoundKey || !FINGERPRINT_DB[compoundKey]) {return null;}

    return {
      ...FINGERPRINT_DB[compoundKey],
      matchType: match.matchType,
      matchScore: match.score,
      key: compoundKey,
    };
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
