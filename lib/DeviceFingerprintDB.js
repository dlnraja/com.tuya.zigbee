'use strict';

const { normalize } = require('./utils/CaseInsensitiveMatcher');
const FingerprintMatcher = require('./utils/fingerprint-matcher');
const UserMisattributionRegistry = require('./pairing/UserMisattributionRegistry');

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
  '_TZE284_fodv6bkr|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Forum Eduard_Martirosyan #2228 DC tubular roller blind motor' },
  '_tze284_fodv6bkr|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Forum Eduard_Martirosyan #2228 DC tubular roller blind motor' },
  '_TZE284_FODV6BKR|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Forum Eduard_Martirosyan #2228 DC tubular roller blind motor' },
  '_tze284_fodv6bkr|ts0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Forum Eduard_Martirosyan #2228 DC tubular roller blind motor' },
  '_TZE284_FODV6BKR|ts0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Forum Eduard_Martirosyan #2228 DC tubular roller blind motor' },
  '_TZE284_libht6ua|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Roller blind motor sibling to fodv6bkr' },
  '_tze284_libht6ua|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Roller blind motor sibling to fodv6bkr' },
  '_TZE284_LIBHT6UA|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Roller blind motor sibling to fodv6bkr' },
  '_tze284_libht6ua|ts0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Roller blind motor sibling to fodv6bkr' },
  '_TZE284_LIBHT6UA|ts0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'battery', dp: { 1: 'windowcoverings_state', 2: 'windowcoverings_set/100', 3: 'windowcoverings_set/100', 5: 'reverse_direction', 13: 'measure_battery' }, notes: 'Roller blind motor sibling to fodv6bkr' },
  '_TZ3000_blhvsaqf|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'Issue #540 1-gang switch module' },
  '_tz3000_blhvsaqf|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'Issue #540 1-gang switch module' },
  '_TZ3000_BLHVSAQF|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'Issue #540 1-gang switch module' },
  '_tz3000_blhvsaqf|ts0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'Issue #540 1-gang switch module' },
  '_TZ3000_BLHVSAQF|ts0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'Issue #540 1-gang switch module' },
  '_TZE284_sgabhwa6|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  // Forum #1610 / P2259 — HOBEIAN ZG-223Z rainwater sensor, not water leak
  'HOBEIAN|ZG-223Z': { driver: 'rain_sensor', protocol: 'hybrid', powerSource: 'battery', notes: 'IAS rain + ZCL illuminance + CR123A; forbid water_leak_sensor' },
  '_TZ3210_3lbtuxgp|TS0505B': { driver: 'bulb_rgb', protocol: 'zcl', powerSource: 'mains', notes: 'Tuya RGBCW downlight Z2M #13579; forbid wall_dimmer_tuya' },
  '_TZ3000_upgcbody|TS0207': { driver: 'water_leak_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'Z2M TS0207 water leak IAS; melectro T89271 #651' },
  '_TZ3218_t9ynfz4x|TS0225': { driver: 'motion_sensor_radar_mmwave', protocol: 'hybrid', powerSource: 'mains', notes: 'P2261: settings via 0xE002 attrs 57348/57349/57355 (fallback 0xE001) + DP101 fading' },
  '_TZ3218_awarhusb|TS0225': { driver: 'motion_sensor_radar_mmwave', protocol: 'hybrid', powerSource: 'mains' },
  '_TZ3218_ewrxirng|TS0225': { driver: 'motion_sensor_radar_mmwave', protocol: 'hybrid', powerSource: 'mains' },
  '_TZE284_debczeci|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'iHseno mmWave DP1 presence; Johan T26439 #5493' },
  '_TZE284_1lvln0x6|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Z2M sibling of debczeci' },
  '_TZE204_debczeci|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery' },
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
  // WHY P2264: ZHA #862 — EP1 lux/battery/0xE002; temp+humidity on virtual EP2 after magic 0xFFFE
  '_TZ3000_qaaysllp|TS0201': {
    driver: 'lcdtemphumidluxsensor',
    protocol: 'zcl',
    powerSource: 'battery',
    notes: 'Neo NAS-TH02B; virtual EP2 + TuyaMagicPacket; never climate_sensor-only',
  },
  '_TZE200_locansqn|TS0601': { driver: 'lcdtemphumidsensor', protocol: 'tuya_dp', powerSource: 'battery' },
  // WHY: Homey cartesian match — TS0601 must NOT live on contact_sensor (P126 / 2imwyigp).
  // Narrow driver contact_sensor_zigbee owns pay2byax|TS0601 only; ZG-102ZL stays on contact_sensor.
  '_TZE200_pay2byax|TS0601': { driver: 'contact_sensor_zigbee', protocol: 'tuya_dp', powerSource: 'battery', notes: 'ZG-102ZL luminance contact; P2201 P126-safe' },
  '_TZE204_pay2byax|TS0601': { driver: 'contact_sensor_zigbee', protocol: 'tuya_dp', powerSource: 'battery', notes: 'TZE204 sibling; P2201 P126-safe' },
  '_TZE200_pay2byax|ZG-102ZL': { driver: 'contact_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZE204_pay2byax|ZG-102ZL': { driver: 'contact_sensor', protocol: 'tuya_dp', powerSource: 'battery' },
  '_TZ3000_amdymr7l|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains', notes: 'BlitzWolf BW-SHP13 metering; never button' },
  '_TZ3210_amdymr7l|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains', notes: 'BlitzWolf BW-SHP13 TZ3210 sibling; Phoscon/Z2M' },
  '_TZE200_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZE204_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZE284_d0ypnbvn|TS0601': { driver: 'valve_irrigation', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff' } },
  '_TZ3000_iol4bl2y|TS0003': { driver: 'switch_3gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2, 3] },
  '_TZ3000_wzmuk9ai|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_ww6drja5|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_46t1rvdu|TS0001': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_b4awzgct|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery', notes: 'P2285 Z2M SH-SC07 1-btn (was 4_ts0041 misroute)' },
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
  // WHY P2266: HACF #38762 / ZHA #2862 Temu round LCD — ZCL EP1 (not Neo EP2). Sibling TZE200|TS0601 is EF00.
  '_TZ3000_bjawzodf|TY0201': {
    driver: 'lcdtemphumidsensor',
    protocol: 'zcl',
    powerSource: 'battery',
    notes: 'Temu WSD500A-class; magic 0xFFFE; clusters 0/1/3/1026/1029',
  },
  '_TZ3000_bjawzodf|TS0201': {
    driver: 'lcdtemphumidsensor',
    protocol: 'zcl',
    powerSource: 'battery',
    notes: 'Z2M WSD500A fingerprint sibling of TY0201',
  },
  // WHY P2267: HA community LCD beeper mute via E002 0xD010 — couple from thread
  '_TZ3210_qkj7rujp|TS0201': {
    driver: 'lcdtemphumidsensor',
    protocol: 'zcl',
    powerSource: 'battery',
    notes: 'LCD with E002 alarms; silence via beepSilence 0xD010',
  },
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
  // P2244 Nobø SWS-IZ diag 9cbf9eb6 — rejects 0x8004; physical = multi-EP 0xFD (DeviceOperatingMode ts0044 family)
  '_TZ3000_xffhmvhv|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Nobø SWS-IZ — skip 0x8004; OnOff 0xFD path. Update Test + re-pair.' },
  // P2246 — HOBEIAN retail pids (one mfr → many variants; never invent TS0601-only)
  'HOBEIAN|ZG-102Z': { driver: 'contact_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'Interview INT-159; ZG-102ZL luminance sibling on contact_sensor' },
  'HOBEIAN|ZG-102ZL': { driver: 'contact_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'P2251 luminance contact sibling' },
  'HOBEIAN|ZG-227Z': { driver: 'climate_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'Interview INT-031 temp/humidity' },
  'HOBEIAN|ZG-227ZL': { driver: 'climate_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'P2251 LCD climate sibling of ZG-227Z' },
  'HOBEIAN|ZG-204ZM': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Interview / market apply-safe mmWave' },
  'HOBEIAN|ZG-204ZV': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Interview / market apply-safe mmWave' },
  'HOBEIAN|ZG-204ZL': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2251 PIR/radar family' },
  'HOBEIAN|ZG-204ZE': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2251 presence family' },
  // P2421 — Z2M herdsman locks (mfr+pid only; never invent)
  'HOBEIAN|ZG-204ZH': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 ZG-204ZH climate+presence' },
  'HOBEIAN|ZG-302ZM': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 motion sensing switch 3ch' },
  'HOBEIAN|ZG-302ZL': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 motion sensing switch 3ch alt DP' },
  '_TZE200_2aaelwxk|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZM' },
  '_TZE200_kb5noeto|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZM' },
  '_TZE200_tyffvoij|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZM' },
  '_TZE200_yflzeeqj|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZM — was climate cartesian' },
  '_TZE200_vuqzj1ej|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZH — was climate cartesian' },
  '_TZE200_hdih4foa|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2421 Z2M ZG-204ZH — was climate cartesian' },
  '_TZE200_kccdzaeo|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM — was vibration cartesian' },
  '_TZE200_s7rsrtbg|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM' },
  '_TZE200_tmszbtzq|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM' },
  '_TZE200_bfmfhxra|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM' },
  '_TZE200_ahpcyzth|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM' },
  '_TZE200_kijxnb8q|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZM' },
  '_TZE200_khzbklyh|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL — was vibration cartesian' },
  '_TZE200_df04ghrb|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL' },
  '_TZE200_toeldckg|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL' },
  '_TZE200_cqtamhh5|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL' },
  '_TZE200_xlnzk169|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL' },
  '_TZE200_llvwkkde|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2421 Z2M ZG-302ZL' },
  // P2422 full HOBEIAN fleet
  'HOBEIAN|ZG-102ZM': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 contact+vibration' },
  '_TZE200_jfw0a4aa|TS0601': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZG-102ZM' },
  '_TZE200_wzk0x7fq|TS0601': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZG-102ZM' },
  'HOBEIAN|ZG-103Z': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 tilt vibration' },
  '_TZE200_iba1ckek|TS0601': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZG-103Z' },
  'HOBEIAN|ZG-204ZK': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZK' },
  '_TZE200_zbfmvj13|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZK' },
  'HOBEIAN|ZG-204ZE': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZE' },
  'HOBEIAN|ZG-204ZQ': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZQ climate+PIR' },
  'HOBEIAN|ZG-204ZX': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZX' },
  '_TZE200_w0ap83qu|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 ZX' },
  'HOBEIAN|ZG-226Z': { driver: 'water_leak_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 water alarm' },
  'HOBEIAN|ZG-228Z': { driver: 'vibration_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2422 vibration alarm' },
  'HOBEIAN|ZG-106Z': { driver: 'illuminance_sensor', protocol: 'zcl', powerSource: 'battery', notes: 'P2251 HOBEIAN lux' },
  'HOBEIAN|ZG-101ZL': { driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery', notes: 'P2251 HOBEIAN 1-btn' },
  'HOBEIAN|ZG-302Z3': {driver:"switch_3gang",protocol:"zcl",powerSource:"mains",notes:"P2430 HOBEIAN 3-gang wall switch"},
  'HOBEIAN|ZG-302Z2': {driver:"switch_2gang",protocol:"zcl",powerSource:"mains",notes:"P2430 HOBEIAN 2-gang wall switch"},
  'HOBEIAN|ZG-302Z1': {driver:"switch_1gang",protocol:"zcl",powerSource:"mains",notes:"P2430 HOBEIAN 1-gang wall switch"},
  'HOBEIAN|ZG-301Z-2CH': {driver:"switch_2gang",protocol:"zcl",powerSource:"mains",notes:"P2430 HOBEIAN 2-gang in-wall switch"},
  'HOBEIAN|ZG-301Z': {driver:"switch_1gang",protocol:"zcl",powerSource:"mains",notes:"P2430 HOBEIAN 1-gang in-wall switch"},
  'HOBEIAN|ZG-101ZD': {driver:"button_wireless_1",protocol:"zcl",powerSource:"battery",notes:"P2430 HOBEIAN smart knob / 1-btn"},
  'HOBEIAN|ZG-101ZS': {driver:"scene_switch_4",protocol:"zcl",powerSource:"battery",notes:"P2430 HOBEIAN Star Ring 4-gang scene switch"},
  'HOBEIAN|ZG-103ZL': {driver:"vibration_sensor",protocol:"tuya_dp",powerSource:"battery",notes:"P2430 HOBEIAN vibration ZL"},
  'HOBEIAN|ZG-229Z': {driver:"siren",protocol:"tuya_dp",powerSource:"mains",notes:"P2430 HOBEIAN smart siren light/sound"},
  'HOBEIAN|ZG-225Z': {driver:"gas_sensor",protocol:"tuya_dp",powerSource:"mains",notes:"P2430 HOBEIAN gas sensor"},
  'HOBEIAN|ZG-222ZA': {driver:"water_leak_sensor",protocol:"ias_zone",powerSource:"battery",notes:"P2430 HOBEIAN water leak ZA"},
  'HOBEIAN|ZG-205ZL': {driver:"presence_sensor_radar",protocol:"tuya_dp",powerSource:"battery",notes:"P2430 HOBEIAN radar 205ZL"},
  'HOBEIAN|ZG-205Z': {driver:"presence_sensor_radar",protocol:"tuya_dp",powerSource:"battery",notes:"P2430 HOBEIAN radar 205Z"},
  'HOBEIAN|ZG-204ZP': {driver:"presence_sensor_radar",protocol:"tuya_dp",powerSource:"battery",notes:"P2430 HOBEIAN radar 204ZP"},
  'HOBEIAN|ZG-204Z': {driver:"presence_sensor_radar",protocol:"tuya_dp",powerSource:"battery",notes:"P2430 HOBEIAN radar 204Z"},
  '_TZ3000_nkcobies|TS011F': { driver: 'smartplug', protocol: 'zcl', powerSource: 'mains', notes: 'P2251 forum soft lock verified compose/mfs — not TS0001' },
  '_TZ3000_nkcobies|TS0121': { driver: 'smartplug', protocol: 'zcl', powerSource: 'mains', notes: 'P2251 nkcobies alt pid' },
  '_TZ3000_xabckq1v|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_czuyt8lz|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA/deCONZ' },
  '_TZ3000_b3mgfu0d|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes TS004F 4-button scene switch, cross-checked with Z2M/ZHA' },
  '_TZ3000_rco1yzb1|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Lidl/Moes TS004F remote using OnOff/LevelControl action clusters' },
  '_TZ3000_abrsvsou|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_4fjiwweb|TS004F': { driver: 'button_wireless_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'ZHA TS004F 4-button remote variant' },
  '_TZ3000_402vrq2i|TS004F': { driver: 'smart_knob', protocol: 'zcl', powerSource: 'battery', dpProfile: null, notes: 'ZHA#5261 / GitHub#1349 rotary knob — not 4-gang metering' },
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
  // WHY(P2282): Peter #2202 diag 95a7c6e5 — interview reported HOBEIAN+3315-S on water_leak;
  // never route to soil via mfr-only MISATTR (rain ZG-223Z forbidMode couple).
  'HOBEIAN|3315-S': { driver: 'water_leak_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'P2282 diag 95a7c6e5; IAS water — not soil/rain' },
  'HOBEIAN|3315-Seu': { driver: 'water_leak_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'P2282 EU sibling of 3315-S under HOBEIAN brand interview' },
  // WHY(P2282/P2285): Peter Smartbutton SH-SC07 — exact compound; EP1–4 phantom, 1 physical
  '_TZ3000_mrpevh8p|TS0041': {
    driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery',
    notes: 'P2285 Z2M SH-SC07/Johan#1120; 0xFD scene; skip 0x8004; magic packet; no EF00; battery EP1 only',
  },
  '_TZ3000_5bpeda8u|TS0041': {
    driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery',
    notes: 'P2285 Z2M whitelabel SH-SC07 sibling of mrpevh8p',
  },
  '_TZ3000_b4awzgct|TS0041': {
    driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery',
    notes: 'P2285 was button_wireless_4_ts0041 misroute — Z2M 1-button SH-SC07',
  },
  'eWeLink|SNZB-03': { driver: 'motion_sensor', protocol: 'zcl', dpProfile: null, notes: 'Homey forum #2086/#2088 Sonoff/eWeLink motion sensor fallback' },

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTRY BACKFILL 2026-08-19 — investigated couples (never invent pids)
  // Cross-ref: user-misattribution-registry + Z2M/ZHA/forum. Exact (mfr|pid).
  // ─────────────────────────────────────────────────────────────────────────
  '_TZ3000_k4ej3ww2|TS0207': { driver: 'water_leak_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'HOBEIAN/Aubess IH-K665: IAS Zone 1280 sleepy; reports on wet/dry only; never EF00 water, rain, or repeater. Z2M#17685/#19308' },
  '_TZ3210_imaccztn|TS0004': { driver: 'relay_board_4_channel', protocol: 'zcl', powerSource: 'mains', notes: 'TBoy #2131 4ch relay board; not switch_4gang catch-all' },
  '_TZ3000_w5xztuy7|TS0002': { driver: 'switch_2gang', protocol: 'zcl_only', powerSource: 'mains', notes: 'Kanbros/BSEED ZCL-only 2-gang; leftover 0xEF00 is not MCU; no metering phantoms' },
  '_TYZB01_hlla45kx|TS011F': { driver: 'double_power_point_2', protocol: 'zcl', powerSource: 'mains', notes: 'Welsh #2129 dual outlet; not generic socket / energy plug' },
  '_TZE284_nt4pquef|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL', powerSource: 'battery', dp: { 2: 'light_enum', 3: 'measure_humidity.soil', 5: 'measure_temperature/10', 9: 'temperature_unit', 15: 'measure_battery' }, notes: 'SGS02Z/SG502Z retail labels — pid stays TS0601. DP2 is illuminance enum not moisture. Interview 0xED00 must not be composed. Z2M herdsman#10315 ZHA#4707' },
  '_TZE204_clrdrnya|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'RADAR', powerSource: 'mains', notes: 'MTG235-ZB-RL mmWave+relay (sbyx0lm6 family). Never climate/motion_pir. Z2M#18677 GH#420' },
  '_TZE284_clrdrnya|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'RADAR', powerSource: 'mains', notes: 'TZE284 sibling of clrdrnya radar; same TS0601 couple only' },
  '_TZE200_clrdrnya|TS0601': { driver: 'presence_sensor_radar', protocol: 'tuya_dp', dpProfile: 'RADAR', powerSource: 'mains', notes: 'TZE200 sibling; Z2M discussion#25712 lost-support reminder — keep compound lock' },
  '_TZ3000_wkr3jqmr|TS0004': { driver: 'switch_4gang', protocol: 'zcl', powerSource: 'mains', notes: 'ZHA#2538 ZG-003-RF 4-gang; not 1-gang' },
  '_TZ3210_vbfp8eyv|TS011F': { driver: 'din_rail_switch', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M TS011F_din_smart_relay(+polling); not wireless button' },
  '_TZ3000_qeuvnohg|TS011F': { driver: 'din_rail_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_ky0fq4ho|TS011F': { driver: 'din_rail_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_8bxrzyxz|TS011F': { driver: 'din_rail_switch', protocol: 'zcl', powerSource: 'mains' },
  // P2229 Toni #2191 / Gmail 3a1f196d — Tongou TO-Q-SYS-JZT (never smart_rcbo)
  '_TZE284_6ocnqlhn|TS0601': { driver: 'din_rail_meter', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Tongou TO-Q-SYS-JZT. DP6 type0 composite V/A/W. Forbid smart_rcbo. Re-pair after update.' },
  // WHY P2268: Z2M PJ-MGW1203 clamp — was wrongly on smoke_sensor3
  '_TZE204_cjbofhxw|TS0601': { driver: 'power_clamp_meter', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M PJ-MGW1203; forbid smoke' },
  '_TZE284_cjbofhxw|TS0601': { driver: 'power_clamp_meter', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M PJ-MGW1203; forbid smoke' },
  '_TZE200_cjbofhxw|TS0601': { driver: 'power_clamp_meter', protocol: 'tuya_dp', powerSource: 'mains', notes: 'TZE200 sibling clamp' },
  // WHY P2268: Z2M ATMS10013Z3 3-phase — was wrongly on climate_sensor
  '_TZE284_a14rjslz|TS0601': { driver: 'energy_meter_3phase', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Ourtop ATMS10013Z3; forbid climate' },
  // WHY P2268: ZHA #5260 Zemismart ZB811 — magic packet already in UnifiedSwitchBase
  '_TZ3000_tonrapsk|TS0002': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', endpoints: [1, 2], notes: 'ZHA #5260; per-gang needs Tuya magic' },
  // Soft: ZHA #5117 Moes 3-phase — Z2M converter still absent; route to 3phase meter shell
  '_TZE284_cf4b5ktf|TS0601': { driver: 'energy_meter_3phase', protocol: 'tuya_dp', powerSource: 'mains', notes: 'ZHA #5117 Moes 3-phase; soft lock pending full DP map' },
  // WHY P2270: ZHA #5252 4in1 mmWave — DP1 presence INVERTED (0=occupied)
  '_TZE284_gnpflcoq|TS0601': { driver: 'motion_sensor_radar_mmwave', protocol: 'tuya_dp', powerSource: 'battery', notes: 'ZHA#5252 DP1 inverted presence; DP7 temp/10; DP8 humidity; DP11 lux' },
  // WHY P2270: Z2M#32815 Moes dimmer mesh flood — not a switch_1gang
  '_TZE204_hlx9tnzb|TS0601': { driver: 'dimmer_1_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#32815 dimmer; mesh flap after power cycle' },
  // WHY P2270: ZHA#5270 TS130F curtain variant
  '_TZ3210_jrhczaaa|TS130F': { driver: 'curtain_motor', protocol: 'zcl', powerSource: 'mains', notes: 'ZHA#5270 TS130F variant' },
  // Soft P2270: Z2M#32931 TRV — soft lock radiator valve (no invented DPs)
  '_TZE284_fqm2sfpe|TS0601': { driver: 'device_radiator_valve', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Z2M#32931 TRV soft lock pending full DP map' },
  // WHY P2271: Z2M#32756/#32836 RF Cloner — soft ir_blaster (no invent RF DPs yet)
  '_TZE284_tdg4ckyh|TS0601': { driver: 'ir_blaster', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M RF Cloner / ZRF01 family; soft lock' },
  // WHY P2271: Z2M#31244 Moes SFC02 curtain wall switch
  '_TZE284_kq1l5eu5|TS0601': { driver: 'wall_curtain_switch', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#31244 Moes SFC02 curtain switch; soft pending full DP map' },
  // WHY P2272: Z2M#32594 RGB+CCT controller (brightness 0–1000)
  '_TZE284_bjoccxbi|TS0601': { driver: 'led_controller_rgb', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000', 3: 'light_temperature', 5: 'light_hue' }, notes: 'Z2M#32594 RGB+CCT; MCU brightness 0-1000' },
  // WHY P2272: Z2M#32901 MakeGood dual GPO+USB-C metering
  '_TZE284_lq0ffndf|TS0601': { driver: 'usb_outlet_advanced', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff', 2: 'onoff.gang2', 20: 'meter_power/1000', 21: 'measure_current/1000', 22: 'measure_power/10', 23: 'measure_voltage/10', 101: 'child_lock' }, notes: 'Z2M#32901 MG-AU03GPOZLP; live-tested DPs' },
  // WHY P2272: Z2M#32637 1-gang EF00 switch
  '_TZE284_u15pabbc|TS0601': { driver: 'switch_1gang', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#32637 single switch TS0601' },
  // WHY P2272: Z2M#32638 body fingerprint (title mislabeled u15pabbc)
  '_TZE284_rip8l748|TS0601': { driver: 'switch_2gang', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff', 2: 'onoff.gang2' }, notes: 'OZSMART 2-gang; magic packet; Z2M#32638 body' },
  // WHY P2272: ZHA#5241 TS000F relay — magic enchantment; NOT switch_temp (no DP102 temp)
  '_TZ3218_hdc8bbha|TS000F': { driver: 'switch_1gang', protocol: 'zcl', powerSource: 'mains', notes: 'ZHA#5241 QS-Zigbee-SEC01-DC; magic + onOff 0x8001/0x8002; not 7fiyo3kv temp hybrid' },
  // WHY P2273: ZHA#5140 Moes curtain — was stolen by switch_1gang
  '_TZE204_guvc7pdy|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'ZHA#5140 Moes curtain; forbid switch_1gang' },
  '_TZE200_guvc7pdy|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'TZE200 sibling curtain' },
  // P2324 #533 salvagr — Moes ZTS-EUR-C curtain wall switch (not TRV / generic Zigbee)
  '_TZE204_5slehgeo|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', dpProfile: 'MOES_ZTS_EUR_C', notes: 'GitHub #533 Moes ZTS-EUR-C; forbid radiator/generic' },
  '_TZE284_5slehgeo|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', dpProfile: 'MOES_ZTS_EUR_C', notes: 'TZE284 sibling ZTS-EUR-C' },
  '_TZE200_5slehgeo|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', dpProfile: 'MOES_ZTS_EUR_C', notes: 'TZE200 sibling ZTS-EUR-C' },
  '_TZE200_nhyj64w2|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', dpProfile: 'MOES_ZTS_EUR_C', notes: 'Moes ZTS-EUR-C family' },
  '_TZE200_127x7wnl|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', dpProfile: 'MOES_ZTS_EUR_C', notes: 'Moes ZTS-EUR-C family' },
  // WHY P2273: ZHA#5276 Excellux ZS-300TF soil fertility (corrupt mfr form too)
  '_TZE284_hdml1aav|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'ZHA#5276 ZS-300TF/ZS-301; DP15 battery' },
  '_TZE2841000000_hdml1aav|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Corrupt interview mfr form' },
  // WHY P2273: ZHA#5214 dual dimmer already on dimmer_2_gang_tuya
  '_TZE284_jtbgusdc|TS0601': { driver: 'dimmer_2_gang_tuya', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000', 7: 'onoff.gang2', 8: 'dim.gang2/1000' }, notes: 'ZHA#5214 dual channel dimmer' },
  // WHY P2273: ZHA#5191 pressure mat → bed_sensor
  '_TZE200_seq9cm6u|TS0601': { driver: 'bed_sensor', protocol: 'tuya_dp', powerSource: 'battery', notes: 'ZHA#5191 pressure/occupancy mat' },
  // P2234 — Z2M/ZHA web research 2026-07/08 (rehomes + new couples; never invent pid)
  '_TZ3000_gdsvhfao|TS0001': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#11207 TS0001_repeater — not switch_1gang' },
  '_TZE200_itp8dt7f|TS0601': { driver: 'wall_dimmer_tuya', protocol: 'tuya_dp', dpProfile: 'DIMMER', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000' }, notes: 'Z2M#12213 ION dimmer alias ykgar0ow — not soil' },
  '_TZE200_ykgar0ow|TS0601': { driver: 'wall_dimmer_tuya', protocol: 'tuya_dp', dpProfile: 'DIMMER', powerSource: 'mains', dp: { 1: 'onoff', 2: 'dim/1000' } },
  '_TZ3000_dershnvx|TS0002': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#12246 2-gang no-neutral' },
  '_TZ3000_icoxotza|TS0726': { driver: 'switch_2gang', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#11720 TS0726_2_gang' },
  '_TZE204_qujphad5|TS0601': { driver: 'wall_thermostat', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#12869 TYBAC-006 FCU — not bulb' },
  '_TZE204_ogx8u5z6|TS0601': { driver: 'device_radiator_valve', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2278 me167/thermostat_3 DPs + cal DP47 /10 (ZHA#4124)' },
  '_TZE284_ogx8u5z6|TS0601': { driver: 'device_radiator_valve', protocol: 'tuya_dp', powerSource: 'battery', notes: 'P2278 sibling ogx8u5z6' },
  '_TZE204_mpbki2zm|TS0601': { driver: 'wall_thermostat', protocol: 'tuya_dp', powerSource: 'mains', notes: 'TYBAC-006 — not TRV' },
  '_TZE204_lpedvtvr|TS0601': { driver: 'wall_thermostat', protocol: 'tuya_dp', powerSource: 'mains', notes: 'ZHA#3666 Moes Star Ring — NOT climate (P2277)' },
  '_TZE204_xalsoe3m|TS0601': { driver: 'wall_thermostat', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#25372 BHT-002 sibling aoclfnxz — NOT TRV (P2277)' },
  '_TZ3000_te34fjg4|TS1002': { driver: 'scene_switch_4', protocol: 'zcl', powerSource: 'mains', notes: 'ZHA#5224 Arlight 4-scene 0xFD panel — not bulb (P2277)' },
  '_TZE204_apiu8k13|TS0601': { driver: 'plug_energy_monitor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Water heater power-monitoring switch' },
  '_TZE284_q9qytwfa|TS0601': { driver: 'plug_energy_monitor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#32883 Nisko — same DPs as apiu8k13' },
  '_TZE200_7upwjcca|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#32905 cover motor' },
  '_TZ3000_anptztic|TS0001': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#32609 metering TS0001' },
  '_TZ3210_6cmeijtd|TS011F': { driver: 'socket_power_strip', protocol: 'zcl', powerSource: 'mains', notes: 'Nous A11Z 3-gang strip — magic packet + multi-ep; not usb_dongle_triple (Z2M#30799)' },
  '_TZ3000_ly9apzky|TS0003': { driver: 'wall_switch_3gang_1way', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#32810 3ch relay' },
  '_TZE204_pkpfn9hc|TS0601': { driver: 'air_quality_co2', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Z2M#12949 CO2/temp/humidity' },
  '_TZE200_ogkdpgy2|TS0601': { driver: 'air_quality_co2', protocol: 'tuya_dp', powerSource: 'mains', dp: { 2: 'measure_co2' }, notes: 'Z2M DCR-LCD NDIR CO2 — Elliot #2204; forbid climate_sensor' },
  '_TZE204_ogkdpgy2|TS0601': { driver: 'air_quality_co2', protocol: 'tuya_dp', powerSource: 'mains', dp: { 2: 'measure_co2' }, notes: 'Z2M#24858 mains router CO2-only DP2 — forum T140352 #2204' },
  '_TZ3002_y7wpizuw|TS0726': { driver: 'switch_4gang', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M#32628 4-gang TS0726' },
  '_TZE284_smcqit2l|TS0601': { driver: 'wall_thermostat', protocol: 'tuya_dp', powerSource: 'battery', notes: 'Z2M#32568 BHT-209W interview mfr' },
  '_TZE284_6uyu20xu|TS0601': { driver: 'climate_sensor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'Z2M#32491 Chayo TOVTH temp/humidity' },
  // P2229 meter91 #2189 — Moes 4-way scene remote 0xFD
  '_TZ3000_4upl1fcj|TS0041': { driver: 'button_wireless_1', protocol: 'zcl', powerSource: 'battery', notes: 'P2236 SunBeech T156967 — TS0041 remote NOT switch_1gang' },
  '_TZ3000_zgyzgdua|TS0044': { driver: 'scene_switch_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'Moes XH-SY-04Z physical press genOnOff 0xFD; skip 0x8004. Update Test + re-pair.' },
  '_TZ3000_vp6clf9d|TS0044': { driver: 'scene_switch_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'P2337 battery scene remote — forbid wall_remote_4_gang steal' },
  '_TZ3000_ufhtxr59|TS0044': { driver: 'scene_switch_4', protocol: 'zcl', dpProfile: null, endpoints: [1, 2, 3, 4], notes: 'P2337 battery scene remote — forbid wall_remote_4_gang steal' },
  '_TZ3000_obacbukl|TS0503A': { driver: 'led_strip_rgbw', protocol: 'zcl', powerSource: 'mains', notes: 'LED strip controller; not button or E14 CCT' },
  '_TZE200_1fuxihti|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2279 cover — unsteal climate' },
  '_TZE204_1fuxihti|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2279 cover sibling' },
  '_TZE284_1fuxihti|TS0601': { driver: 'curtain_motor', protocol: 'tuya_dp', powerSource: 'mains', notes: 'P2279 Z2M cover; was climate steal' },
  '_TZE284_mvtclclq|TS0601': { driver: 'usb_outlet_advanced', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff.usb1', 2: 'onoff.usb2', 3: 'onoff', 4: 'onoff.socket2' }, notes: 'Z2M DS-1450WN — forbid wall_dimmer. z2m#31275' },
  '_TZE204_mvtclclq|TS0601': { driver: 'usb_outlet_advanced', protocol: 'tuya_dp', powerSource: 'mains', dp: { 1: 'onoff.usb1', 2: 'onoff.usb2', 3: 'onoff', 4: 'onoff.socket2' } },
  '_TZ3210_jaap6jeb|TS0505B': { driver: 'bulb_rgbw', protocol: 'zcl', powerSource: 'mains', notes: 'LEDEPLY SG45-E26 RGB+CCT; not door/motion' },
  '_TZ3000_vzopcetz|TS011F': { driver: 'socket_power_strip', protocol: 'zcl', powerSource: 'mains', notes: 'Johan/Silvercrest metering plug/strip; not button or E14' },
  '_TZ3000_1obwwnmq|TS011F': { driver: 'socket_power_strip', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3210_iystcadi|TS0505B': { driver: 'light_bulb_rgb_led', protocol: 'zcl', powerSource: 'mains', notes: 'Lidl/Livarno RGB+CCT. Never steal via shared TS0601. z2m#12090' },
  'HOBEIAN|ZG-303Z': { driver: 'soil_sensor', protocol: 'tuya_dp', notes: 'Retail ZG-303Z only — do NOT lock HOBEIAN|TS0601 (other HOBEIAN TS0601 exist)' },
  '_TZE200_wqashyqo|TS0601': { driver: 'soil_sensor', protocol: 'tuya_dp', dpProfile: 'SOIL', notes: 'HOBEIAN ZG-303Z MCU soil; DP107 moisture family. nt4pquef is a different couple' },
  '_TZ3000_3zofvcaa|TS011F': { driver: 'switch_usb_dongle', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M TS011F_2_gang_2_usb_wall; no climate endpoint' },
  '_TZ3000_lqb7lcq9|TS011F': { driver: 'switch_usb_dongle', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_pvlvoxvt|TS011F': { driver: 'switch_usb_dongle', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3210_8n4dn1ne|TS011F': { driver: 'switch_usb_dongle', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3210_urjf5u18|TS011F': { driver: 'switch_usb_dongle', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_5k5vh43t|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains', notes: 'TS0207_repeater — no IAS, not water leak. Pid TS0207 is shared with k4ej3ww2 water' },
  '_TZ3000_gszjt2xx|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_misw04hq|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_nkkl7uzv|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_nlsszmzl|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_ufttklsz|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_wlquqiiz|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_m0vaazab|TS0207': { driver: 'zigbee_repeater', protocol: 'zcl', powerSource: 'mains' },
  '_TZE200_2imwyigp|TS0601': { driver: 'switch_3gang', protocol: 'tuya_dp', powerSource: 'mains', notes: 'MG-ZG03W 3-gang MCU; not contact sensor' },
  '_TZ3000_g9g2xnch|TS004F': { driver: 'smart_knob', protocol: 'zcl', powerSource: 'battery', notes: 'YSR-MINI-Z scene/dim remote; not mains 1-gang' },
  '_TZ3000_r0o2dahu|TS004F': { driver: 'smart_knob', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3000_fa9mlvja|TS0043': { driver: 'remote_button_wireless', protocol: 'zcl', powerSource: 'battery', notes: 'IH-K663 smart button; not 4-gang wall. Local Z2M dump may list TS0041 for this mfr — do not invent a second pid' },
  '_TZ3000_uri7ongn|TS004F': { driver: 'smart_knob', protocol: 'zcl', powerSource: 'battery', notes: 'ERS-10TZBVK-AA / ZG-101ZD rotary; never power_meter' },
  '_TZ3000_ixla93vd|TS004F': { driver: 'smart_knob', protocol: 'zcl', powerSource: 'battery' },
  '_TZ3210_ol1uhvza|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains', notes: 'ZHA#5226 inverted lift % + mid-travel; invert_position + RX reporting (P2275)' },
  '_TZE284_rccxox8p|TS0601': { driver: 'smoke_sensor2', protocol: 'hybrid', powerSource: 'battery', notes: 'ZHA#4687 PA-44Z smoke IAS+EF00 battery DP15 — NOT climate (P2276)' },
  '_TZE200_rccxox8p|TS0601': { driver: 'smoke_sensor2', protocol: 'hybrid', powerSource: 'battery', notes: 'PA-44Z sibling' },
  '_TZE204_rccxox8p|TS0601': { driver: 'smoke_sensor2', protocol: 'hybrid', powerSource: 'battery' },
  '_TZE284_dikb3dp6|TS0601': { driver: 'energy_meter_3phase', protocol: 'tuya_dp', powerSource: 'mains', notes: 'ZHA#3955 Zemismart 3-phase DIN meter — NOT climate (P2276)' },
  '_TZE200_dikb3dp6|TS0601': { driver: 'energy_meter_3phase', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZE204_dikb3dp6|TS0601': { driver: 'energy_meter_3phase', protocol: 'tuya_dp', powerSource: 'mains' },
  '_TZ3210_dwytrmda|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_n2egfsli|TS0203': { driver: 'contact_sensor', protocol: 'ias_zone', powerSource: 'battery', notes: 'Door/window IAS; never button_wireless_2' },
  '_TZ3000_1dd0d5yi|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains', notes: 'Moes MS-108ZR family; not shutter catch-all' },
  '_TZ3000_femsaaua|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_e3vhyirx|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZ3000_jwv3cwak|TS130F': { driver: 'wall_curtain_switch', protocol: 'zcl', powerSource: 'mains' },
  '_TZB210_g01ie5wu|TS0501B': { driver: 'wall_dimmer_1gang_1way', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M TS0501B_dimmer_2; not wall_dimmer_tuya (MCU 0-1000 family)' },
  '_TZE200_a4bpgplm|TS0601': { driver: 'device_radiator_valve', protocol: 'tuya_dp', dpProfile: 'TRV', powerSource: 'battery', notes: 'TRV06 family; never generic_diy' },
  '_TZ3000_okaz9tjs|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains', notes: 'Z2M TS011F_plug_3: fw 1.0.5+ needs electrical poll (no auto report). z2m#13191. Not wireless button' },
  '_TZ3210_fgwhjm9j|TS011F': { driver: 'plug_energy_monitor', protocol: 'zcl', powerSource: 'mains', notes: 'HomeSuite field metering plug sibling; ZCL electrical+metering; not climate' },
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
  'TS011F': { driver: null, type: 'plug', notes: 'Ambiguous pid: metering plug, double outlet, DIN relay, USB wall, strip. Lock (mfr,pid). Never energy-plug from pid alone.' },
  'TS0121': { driver: 'plug_energy_monitor', type: 'plug' },
  'TS0201': { driver: null, type: 'sensor', notes: 'Requires manufacturerName — one mfr can be climate OR lux OR other; never invent couple' },
  'TS0202': { driver: 'motion_sensor', type: 'sensor' },
  'TS0203': { driver: 'contact_sensor', type: 'sensor', notes: 'Tuya door/window; never invent water-leak from pid alone' },
  'ZG-305Z': { driver: 'switch_2gang', type: 'switch', notes: 'HOBEIAN/MHCOZY 2-channel USB switch (Johan PR #1435)' },
  'SNZB-03': { driver: 'motion_sensor', type: 'sensor' },
  'TS0205': { driver: 'smoke_sensor', type: 'sensor' },
  'TS0207': { driver: null, type: 'sensor', notes: 'Ambiguous pid: IAS water leak vs rain vs repeater. k4ej3ww2=water IAS; 5k5vh43t=repeater. Never rain/water from pid alone.' },
  'TS000F': { driver: null, type: 'switch', notes: 'Often 1-gang ZCL; _TZ3218_7fiyo3kv/_TZ3218_ya5d6wth + TS000F is hybrid switch+temp (DP102). Never invent a second pid.' },
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
  'ZG-101ZL': { driver: 'button_wireless_1', type: 'button', notes: 'HOBEIAN 1-btn wireless button' },
  'ZG-102Z': { driver: 'contact_sensor', type: 'sensor', notes: 'HOBEIAN contact sensor' },
  'ZG-102ZL': { driver: 'contact_sensor', type: 'sensor', notes: 'HOBEIAN contact + illuminance sensor' },
  'ZG-103Z': { driver: 'vibration_sensor', type: 'sensor', notes: 'HOBEIAN vibration tilt sensor' },
  'ZG-106Z': { driver: 'illuminance_sensor', type: 'sensor', notes: 'HOBEIAN light sensor' },
  'ZG-204ZM': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN radar mmWave presence' },
  'ZG-204ZV': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN presence sensor' },
  'ZG-204ZL': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN presence sensor' },
  'ZG-204ZE': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN presence sensor' },
  'ZG-204ZH': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN presence + climate sensor' },
  'ZG-223Z': { driver: 'rain_sensor', type: 'sensor', notes: 'HOBEIAN rain sensor' },
  'ZG-226Z': { driver: 'water_leak_sensor', type: 'sensor', notes: 'HOBEIAN water detector' },
  'ZG-227Z': { driver: 'climate_sensor', type: 'sensor', notes: 'HOBEIAN temp & humidity sensor' },
  'ZG-227ZL': { driver: 'climate_sensor', type: 'sensor', notes: 'HOBEIAN LCD temp & humidity sensor' },
  'ZG-228Z': { driver: 'vibration_sensor', type: 'sensor', notes: 'HOBEIAN vibration alarm' },
  'ZG-301Z': { driver: 'switch_1gang', type: 'switch', notes: 'HOBEIAN 1-gang in-wall switch' },
  'ZG-302ZM': { driver: 'presence_sensor_radar', type: 'sensor', notes: 'HOBEIAN motion switch' },
  'ZG-303Z': { driver: 'soil_sensor', type: 'sensor', notes: 'HOBEIAN soil moisture/temp sensor' },
  'SNZB-01': { driver: 'button_wireless_1', type: 'button' },
  'SNZB-02': { driver: 'climate_sensor', type: 'sensor' },
  'SNZB-04': { driver: 'contact_sensor', type: 'sensor' },
  'ZBMINI': { driver: 'switch_1gang', type: 'switch' },
  'ZBMINI-L': { driver: 'switch_1gang', type: 'switch' },
  'ZBMINIL2': { driver: 'switch_1gang', type: 'switch' },
  'IH-K009': { driver: 'button_wireless_1', type: 'button' },
  'IH-K663': { driver: 'remote_button_wireless', type: 'button' },
  'IH-K665': { driver: 'water_leak_sensor', type: 'sensor' },
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

    // Priority 2.1: Manufacturer alias compensation (e.g. Heobian/heobian -> HOBEIAN)
    const mfrNorm = normalize(manufacturerName);
    const aliasMfr = (mfrNorm === 'heobian' || mfrNorm === 'hobeian') ? 'HOBEIAN' : null;
    if (aliasMfr) {
      const aliasKey = normalize(`${aliasMfr}|${productId}`);
      for (const [k, v] of Object.entries(FINGERPRINT_DB)) {
        if (normalize(k) === aliasKey) {return { ...v, matchType: 'exact_ci_alias', key: k };}
      }
    }

    // Priority 2.2: Community wrong-driver misattribution registry
    try {
      const reg = UserMisattributionRegistry.lookup(manufacturerName, productId);
      if (reg && reg.canonicalDriver && reg.enrichOnly !== true) {
        return {
          driver: reg.canonicalDriver,
          protocol: reg.protocol || 'tuya_dp',
          powerSource: reg.powerSource || 'mains',
          matchType: 'registry_compound',
          key,
          notes: reg.notes || reg.id,
        };
      }
    } catch {
      // safe fallback if registry lookup fails
    }

    // Priority 2.5 (P92): Heuristic compound key — interchangeable TZE
    // prefixes (_TZE200/_TZE204/_TZE284/_TYST11) and fuzzy suffix (edit
    // distance <= 2). Same productId required; exact/case-insensitive
    // paths above always win first.
    if (HEURISTIC_ENABLED) {
      const heuristic = this._heuristicLookup(manufacturerName, productId);
      if (heuristic) {return heuristic;}
    }

    // Priority 3: ProductId default (when mfr not in DB) - case-insensitive
    const pidDefault = PRODUCT_ID_DEFAULTS[productId]
      || PRODUCT_ID_DEFAULTS[String(productId).toUpperCase()]
      || Object.entries(PRODUCT_ID_DEFAULTS).find(
        ([k]) => k.toLowerCase() === String(productId).toLowerCase()
      )?.[1];
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
