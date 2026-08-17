#!/usr/bin/env node
'use strict';

/**
 * re-inject-manual-fixes.js — v9.0.262 (P63.3)
 *
 * The auto-publish bot (github-actions[bot]) regenerates `app.json` and
 * `drivers/<name>/driver.compose.json` from canonical templates. Manual
 * fingerprint edits (e.g. HOBEIAN added in P61) are often silently dropped
 * by these regenerations.
 *
 * This script re-applies the manual fixes AFTER the bot regeneration. Wire
 * it into the auto-fix-and-publish.yml workflow as a post-build hook:
 *
 *   - name: "🔁 Re-inject manual driver fixes (P63.3)"
 *     run: node tools/ci/re-inject-manual-fixes.js
 *
 * The fixes are listed in MANUAL_FIXES below. Each entry has:
 *   - file: relative path to the file to patch
 *   - match: function (content) => array of fingerprints that should be present
 *   - addIfMissing: list of fingerprints to ensure are in the file
 *   - source: tag (e.g. 'p61-fix', 'p63.2') for traceability
 *
 * The script is idempotent — running it twice has no effect on the second run.
 *
 * Why this exists (P63.3):
 *   The 2026-07-15 audit (forum #2108 + master history) found that the
 *   v9.0.252 auto-publish bot reverted the HOBEIAN P61 fix in
 *   `drivers/sensor_contact_zigbee/driver.compose.json` while adding it
 *   back to the compiled `app.json` — inconsistent state. The compiled
 *   manifest is what users actually run, so functionality was preserved,
 *   but the source-of-truth was broken and any future regeneration from
 *   source would lose the fix permanently.
 *
 *   This script ensures the SOURCE files (driver.compose.json) always
 *   have the manual fixes, so the next regeneration includes them.
 */

const fs = require('fs');
const path = require('path');
const {
  includesCI,
  mergeManufacturerCaseVariants,
} = require('../../lib/utils/TuyaNormalizer');

const ROOT = path.resolve(__dirname, '..', '..');
const { claimedElsewhere } = require('../../scripts/lib/fp-collision-guard');

const MANUAL_FIXES = [
  {
    id: 'p61-hobeian-sensor-contact-zigbee',
    file: 'drivers/sensor_contact_zigbee/driver.compose.json',
    description: 'Peter #2108: HOBEIAN door/window sensor',
    match: (mfrs) => ['HOBEIAN', 'hobeian', 'Hobeian'].some(x => mfrs.includes(x)),
    addIfMissing: ['HOBEIAN', 'hobeian', 'Hobeian'],
    addAtTop: true,
    source: 'p61-fix',
  },
  {
    id: 'p61-hobeian-water-leak-sensor',
    file: 'drivers/water_leak_sensor/driver.compose.json',
    description: 'Peter #2090: HOBEIAN ZG-222Z water detector — DISABLED in P74 (collision with sensor_contact_zigbee)',
    match: (mfrs) => false, // P74: HOBEIAN | TS0601 collides with sensor_contact_zigbee (Hobeian ZG-301Z door sensor)
    addIfMissing: [],
    addAtTop: false,
    source: 'p74-disabled',
  },
  // P129: Z2M/ZHA confirm mfr+TS004F are 4-button remotes (not switch_1gang).
  // P93 wrongly parked xabckq1v/czuyt8lz on switch_1gang (no TS004F productId there).
  // Order: strip wrong homes FIRST, then inject into button_wireless_4 (collision guard).
  {
    id: 'p129-switch-1gang-remove-ts004f-remotes',
    file: 'drivers/switch_1gang/driver.compose.json',
    description: 'P129: TS004F remotes must not dual-home on switch_1gang catch-all',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: [
      '_TZ3000_xabckq1v', '_tz3000_xabckq1v', '_TZ3000_XABCKQ1V', '_tz3000_XABCKQ1V',
      '_TZ3000_czuyt8lz', '_tz3000_czuyt8lz', '_TZ3000_CZUYT8LZ', '_tz3000_CZUYT8LZ',
      '_TZ3000_b3mgfu0d', '_tz3000_b3mgfu0d', '_TZ3000_B3MGFU0D', '_tz3000_B3MGFU0D',
      '_TZ3000_abrsvsou', '_tz3000_abrsvsou', '_TZ3000_ABRSVSOU', '_tz3000_ABRSVSOU',
      '_TZ3000_4fjiwweb', '_tz3000_4fjiwweb', '_TZ3000_4FJIWWEB', '_tz3000_4FJIWWEB',
    ],
    addAtTop: false,
    source: 'p129-ts004f-routing',
  },
  {
    id: 'p129-button-wireless-4-ts004f-mfrs',
    file: 'drivers/button_wireless_4/driver.compose.json',
    description: 'P129: Moes/Lidl/ZHA TS004F 4-button remotes (forum-routing + Z2M)',
    match: (mfrs) => mfrs.includes('_TZ3000_kfu8zapd') && mfrs.includes('_TZ3000_xabckq1v'),
    addIfMissing: [
      '_TZ3000_u3nv1jwk',
      '_TZ3000_kfu8zapd',
      '_TZ3000_rco1yzb1',
      '_TZ3000_xabckq1v', '_tz3000_xabckq1v', '_TZ3000_XABCKQ1V', '_tz3000_XABCKQ1V',
      '_TZ3000_czuyt8lz', '_tz3000_czuyt8lz', '_TZ3000_CZUYT8LZ', '_tz3000_CZUYT8LZ',
      '_TZ3000_b3mgfu0d', '_tz3000_b3mgfu0d', '_TZ3000_B3MGFU0D', '_tz3000_B3MGFU0D',
      '_TZ3000_abrsvsou', '_tz3000_abrsvsou', '_TZ3000_ABRSVSOU', '_tz3000_ABRSVSOU',
      '_TZ3000_4fjiwweb', '_tz3000_4fjiwweb', '_TZ3000_4FJIWWEB', '_tz3000_4FJIWWEB',
    ],
    addAtTop: false,
    source: 'p129-ts004f-routing',
  },
  {
    id: 'p93-gas-sensor-remove-zg222z-productid',
    file: 'drivers/gas_sensor_switch/driver.compose.json',
    description: 'P93: ZG-222Z is HOBEIAN water leak — must not be gas_sensor productId',
    match: () => true,
    addIfMissing: [],
    removeProductIds: ['ZG-222Z'],
    addAtTop: false,
    source: 'p93-zg222z-routing',
  },
  {
    id: 'p75.18-smart-knob-rotary-mfrs',
    file: 'drivers/smart_knob_rotary/driver.compose.json',
    description: 'P75.18-22: Smart knob rotary mfrs (Moes/Lidl TS004F)',
    match: (mfrs) => mfrs.includes('_TZ3000_qja6nq5z'),
    addIfMissing: ['_TZ3000_qja6nq5z', '_TZ3000_gwkzibhs', '_TZ3000_ugi8ky6u'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  {
    id: 'p75.18-switch-3gang-mfrs',
    file: 'drivers/switch_3gang/driver.compose.json',
    description: 'P75.18-22: 3-gang switch mfrs',
    match: (mfrs) => mfrs.includes('_TZ3000_eqsair32'),
    addIfMissing: ['_TZ3000_eqsair32', '_TZ3000_qxcnwv26'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  {
    id: 'p75.18-wall-switch-4gang-1way-mfrs',
    file: 'drivers/wall_switch_4gang_1way/driver.compose.json',
    description: 'P75.18-22: 4-gang wall switch mfrs (Moes TS0014)',
    match: (mfrs) => mfrs.includes('_TZ3000_mrduubod'),
    addIfMissing: ['_TZ3000_mrduubod', '_TZ3002_pzao9ls1'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  // P75.31: soil_sensor mfrs (P64.10 + #511 Peter) - bot reverts after P64 tests pass
  {
    id: 'p75.31-soil-sensor-hobeian-zg303z',
    file: 'drivers/soil_sensor/driver.compose.json',
    description: 'P75.31: soil_sensor mfrs - HOBEIAN + ZG-303Z family (Peter #511)',
    match: (mfrs) => mfrs.includes('HOBEIAN'),
    addIfMissing: [
      'HOBEIAN', 'hobeian', 'Hobeian',
      '_TZE284_awepdiwi', '_tze284_awepdiwi',
      '_TZE284_ga1maeof', '_tze284_ga1maeof',
    ],
    addAtTop: false,
    source: 'p75.31-p64.10-p511',
  },
  // P75.31: water_leak_sensor HOBEIAN (P61 fix - was disabled in P74, restored)
  {
    id: 'p75.31-water-leak-sensor-hobeian-zg222z',
    file: 'drivers/water_leak_sensor/driver.compose.json',
    description: 'P75.31: water_leak_sensor HOBEIAN + ZG-222Z (Peter #2090)',
    match: (mfrs) => mfrs.includes('HOBEIAN'),
    addIfMissing: [
      'HOBEIAN', 'hobeian', 'Hobeian',
      '_TZE284_2se8efxh', '_TZE284_xuv7ptg0',
    ],
    addAtTop: true,
    source: 'p75.31-p61-restored',
  },
  // P80: #439 bulk dump into generic_tuya is OBSOLETE for typed couples.
  // P98/P101 sacred-couple rehomes own those mfrs. Keep a soft anchor only
  // for still-ambiguous leftovers (never re-add typed curtain/switch couples).
  {
    id: 'p80-issue-439-generic-tuya-fps',
    file: 'drivers/generic_tuya/driver.compose.json',
    description: 'P80/#439 leftovers: ambiguous mfrs only (typed couples owned by P101)',
    match: (mfrs) => mfrs.includes('_TZ3000_1kmurvlx') || mfrs.includes('_TZ3210_6smingw0'),
    addIfMissing: [
      '_TZ3000_1kmurvlx', '_TZ3210_6smingw0',
    ],
    addAtTop: false,
    source: 'p80-issue-439',
  },
  // P80: PR #512 orphan drivers - 7 drivers enriched (P80.5 v7 also covers more)
  {
    id: 'p80-orphan-device-radiator-valve-smart',
    file: 'drivers/device_radiator_valve_smart/driver.compose.json',
    description: 'P80: thermostat mfrs (Avatto, Beca, Moes TRV family) for HOBEIAN/TS0601',
    match: (mfrs) => mfrs.includes('_TZE200_BVU2WNXZ'),
    addIfMissing: ['_TZE200_BVU2WNXZ', '_TZE200_HVAXB2TC', '_TZE200_AOCLFNXZ', '_TZE200_B6WAX7G0', '_TZE200_2EKUZ3DZ'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-switch-2-gang',
    file: 'drivers/switch_2_gang/driver.compose.json',
    description: 'P80: switch_2_gang mfrs (socket orphan, TS0002/TS0003/TS0012/TS0013/TS011F)',
    match: (mfrs) => mfrs.includes('_TYZB01_ANEIICMQ'),
    addIfMissing: ['_TYZB01_ANEIICMQ', '_TYZB01_ZSL6Z0PW', '_TYZB01_NCUTBJDI', '_TZ3000_v4l4b0lp', '_TZ3000_f09j9qjb'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-switch-wireless',
    file: 'drivers/switch_wireless/driver.compose.json',
    description: 'P80: switch_wireless mfrs (sensor orphan, TS0215A/TS0601)',
    match: (mfrs) => mfrs.includes('_TZE200_LGSTEPHA'),
    addIfMissing: ['_TZE200_LGSTEPHA', '_TZE200_KAGKGK0I', '_TZE200_I0B1DBQU', '_TZE200_RJXQSO4A', '_TZE200_IKVNCLUO'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-temphumidsensor5',
    file: 'drivers/temphumidsensor5/driver.compose.json',
    description: 'P80: temphumidsensor5 mfrs (sensor orphan, TY0201/SNTZ003/TS0201)',
    match: (mfrs) => mfrs.includes('_TYZB01_HJSGDKFL'),
    addIfMissing: ['_TYZB01_HJSGDKFL', '_TYZB01_UJFK3XD9'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-valvecontroller',
    file: 'drivers/valvecontroller/driver.compose.json',
    description: 'P80: valvecontroller mfrs (other class orphan, TS0001/TS0111/TS011F)',
    match: (mfrs) => mfrs.includes('_TYZB01_4TLKSK8A'),
    // P92.99: _TZE200_BXOO2SWD retiré — c'est un dimmer (dimmer_2_gang), pas une valve
    addIfMissing: ['_TYZB01_4TLKSK8A', '_TZ3000_hyarhbyx', '_TZ3000_gjrubzje', '_TZ3000_wpueorev'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-wall-switch-5-gang-tuya',
    file: 'drivers/wall_switch_5_gang_tuya/driver.compose.json',
    description: 'P80: wall_switch_5_gang_tuya mfrs (socket orphan, TS0011/ZBMINI/etc.)',
    match: (mfrs) => mfrs.includes('_TZE200_7TDTQGWV'),
    // P92.99: _TZE200_3P5YDOS3 retiré — dimmer BSEED (wall_dimmer_tuya), pas un 5-gang
    addIfMissing: ['_TZE200_7TDTQGWV', '_TYZB01_QEQVMVTI', '_TZ3000_aetquff4', '_TZ3000_hafsqare'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-flood-sensor',
    file: 'drivers/flood_sensor/driver.compose.json',
    description: 'P80: flood_sensor mfr (sensor orphan, TS0207/RH3001)',
    match: (mfrs) => mfrs.includes('_TZ3000_baeiitad'),
    addIfMissing: ['_TZ3000_baeiitad'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  // P80.5: enrich-orphan-drivers.js v7 - 3 more drivers covered
  {
    id: 'p80.5-orphan-led-controller-rgb',
    file: 'drivers/led_controller_rgb/driver.compose.json',
    description: 'P80.5: led_controller_rgb mfr (light orphan, TS0503/TS0504)',
    match: (mfrs) => mfrs.includes('_TZ3000_iystcadi'),
    addIfMissing: ['_TZ3000_iystcadi'],
    addAtTop: false,
    source: 'p80.5-orphan',
  },
  {
    id: 'p80.5-orphan-relay-board-4-channel',
    file: 'drivers/relay_board_4_channel/driver.compose.json',
    description: 'P80.5: relay_board_4_channel mfrs (socket orphan, TS0004)',
    match: (mfrs) => mfrs.includes('_TZ3000_imaccztn'),
    addIfMissing: ['_TZ3000_imaccztn', '_TZ3000_u3oupgdy'],
    addAtTop: false,
    source: 'p80.5-orphan',
  },
  // P92.99: entrée p80.5-switch-usb-dongle SUPPRIMÉE — ses 4 mfrs étaient des
  // imports heuristiques erronés (switch_2gang/switch_3gang/dimmer_2_gang),
  // sources des collisions TS011F du gate validate. Ne pas réintroduire.
  // P92.91: 9 SOS buttons TS0215A mis-routed to dimmer_wall_1gang by auto-import
  {
    id: 'p92.91-sos-ts0215a-emergency',
    file: 'drivers/button_emergency_sos/driver.compose.json',
    description: 'P92.91: 9 SOS TS0215A (Peter #2118) — re-routed from dimmer_wall_1gang',
    match: (mfrs) => mfrs.includes('_TZ3000_4fsgukof'),
    addIfMissing: [
      '_TZ3000_4fsgukof', '_TZ3000_wr2ucaj9', '_TZ3000_zsh6uat3',
      '_TZ3000_tj4pwzzm', '_TZ3000_2izubafb', '_TZ3000_pkfazisv',
      '_TZ3000_ssp0maqm', '_TZ3000_p3fph1go', '_TZ3000_9r5jaajv',
    ],
    addAtTop: false,
    source: 'p92.91-forum-2118',
  },
  // P92.96: TS0042 2-button remote mis-routed to blaster_remote (IR!)
  {
    id: 'p92.96-tzvbimpq-button-wireless-2',
    file: 'drivers/button_wireless_2/driver.compose.json',
    description: 'P92.96: _TZ3000_tzvbimpq TS0042 (FrankP #1689/#1745) — re-routed from blaster_remote',
    match: (mfrs) => mfrs.includes('_TZ3000_tzvbimpq'),
    addIfMissing: ['_TZ3000_tzvbimpq', '_TZ3000_TZVBIMPQ', '_tz3000_tzvbimpq', '_tz3000_TZVBIMPQ'],
    addAtTop: false,
    source: 'p92.96-forum-1689',
  },
  // P92.95: Moes TS0044 4-button remote (Jocke #2098/#2104)
  {
    id: 'p92.95-kfu8zapd-button-wireless-4',
    file: 'drivers/button_wireless_4/driver.compose.json',
    description: 'P92.95: _TZ3000_kfu8zapd TS0044 Moes remote (Jocke #2098)',
    match: (mfrs) => mfrs.includes('_TZ3000_kfu8zapd'),
    addIfMissing: ['_TZ3000_kfu8zapd', '_TZ3000_KFU8ZAPD', '_tz3000_kfu8zapd', '_tz3000_KFU8ZAPD'],
    addAtTop: false,
    source: 'p92.95-forum-2098',
  },
  // P92.91: issue #514 — 8 new z2m devices (anchors per driver)
  {
    id: 'p92.91-issue-514-button-wireless-4',
    file: 'drivers/button_wireless_4/driver.compose.json',
    description: 'P92.91 #514: _TZ3000_xffhmvhv (Nobø SWS-IZ TS004F)',
    match: (mfrs) => mfrs.includes('_TZ3000_xffhmvhv'),
    addIfMissing: ['_TZ3000_xffhmvhv', '_TZ3000_XFFHMVHV', '_tz3000_xffhmvhv', '_tz3000_XFFHMVHV'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-switch-usb-dongle',
    file: 'drivers/switch_usb_dongle/driver.compose.json',
    description: 'P92.91 #514: _TZ3210_lqb7lcq9 (Nova Digital SA-WK TS011F)',
    match: (mfrs) => mfrs.includes('_TZ3210_lqb7lcq9'),
    addIfMissing: ['_TZ3210_lqb7lcq9', '_TZ3210_LQB7LCQ9', '_tz3210_lqb7lcq9', '_tz3210_LQB7LCQ9'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-wall-thermostat',
    file: 'drivers/wall_thermostat/driver.compose.json',
    description: 'P92.91 #514: Beca BAC-001 + BHT-209-GCZB thermostats',
    match: (mfrs) => mfrs.includes('_TZE204_hpkusvom'),
    addIfMissing: ['_TZE204_hpkusvom', '_TZE284_4cgmagba'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-switch-3gang',
    file: 'drivers/switch_3gang/driver.compose.json',
    description: 'P92.91 #514: _TZE284_exfilann (Nova Digital TO-WK-2W/B)',
    match: (mfrs) => mfrs.includes('_TZE284_exfilann'),
    addIfMissing: ['_TZE284_exfilann', '_TZE284_EXFILANN', '_tze284_exfilann', '_tze284_EXFILANN'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-curtain-motor',
    file: 'drivers/curtain_motor/driver.compose.json',
    description: 'P92.91 #514: _TZE284_n73badib (Nova Digital ZBCMR-02)',
    match: (mfrs) => mfrs.includes('_TZE284_n73badib'),
    addIfMissing: ['_TZE284_n73badib', '_TZE284_N73BADIB', '_tze284_n73badib', '_tze284_N73BADIB'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-smoke-sensor',
    file: 'drivers/smoke_sensor/driver.compose.json',
    description: 'P92.91 #514: _TZE284_qvzsq3s2 (Tuya PA-44Z smoke)',
    match: (mfrs) => mfrs.includes('_TZE284_qvzsq3s2'),
    addIfMissing: ['_TZE284_qvzsq3s2', '_TZE284_QVZSQ3S2', '_tze284_qvzsq3s2', '_tze284_QVZSQ3S2'],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  {
    id: 'p92.91-issue-514-climate-sensor',
    file: 'drivers/climate_sensor/driver.compose.json',
    description: 'P92.91 #514: _TZE284_rjjsib2d (Novato ZSN-03P)',
    match: (mfrs) => mfrs.includes('_TZE284_rjjsib2d'),
    addIfMissing: ['_TZE284_rjjsib2d', '_TZE284_RJJSIB2D', '_tze284_rjjsib2d', '_tze284_RJJSIB2D'],
    removeIfPresent: [
      // Forum #2133: BSEED dimmer socket — must NOT stay on climate_sensor
      '_TZE284_m1cvyneb', '_tze284_m1cvyneb', '_TZE284_M1CVYNEB', '_tze284_M1CVYNEB',
      // Forum #2135: Avatto ZDMS16-2 2ch dimmer — must NOT stay on climate_sensor
      '_TZE204_jtbgusdc', '_tze204_jtbgusdc', '_TZE204_JTBGUSDC', '_tze204_JTBGUSDC',
      '_TZE284_jtbgusdc', '_tze284_jtbgusdc', '_TZE284_JTBGUSDC', '_tze284_JTBGUSDC',
      '_TZE200_jtbgusdc', '_tze200_jtbgusdc',
      '_TZE28C1000000_jtbgusdc', '_tze28c1000000_jtbgusdc',
      '_TZE204_o9gyszw2', '_tze204_o9gyszw2', '_TZE204_O9GYSZW2',
      '_TZE284_o9gyszw2', '_tze284_o9gyszw2',
      '_TZE28C1000000_o9gyszw2', '_tze28c1000000_o9gyszw2',
      '_TZE204_fjms2pi9', '_tze204_fjms2pi9', '_TZE284_fjms2pi9', '_tze284_fjms2pi9',
      '_TZE28C1000000_fjms2pi9', '_tze28c1000000_fjms2pi9',
      // PresentSky / wall 6-gang — must NOT reclaim on climate_sensor
      '_TZE200_8eazvzo6', '_tze200_8eazvzo6', '_TZE200_8EAZVZO6',
      '_TZE204_8eazvzo6', '_tze204_8eazvzo6', '_TZE204_8EAZVZO6',
      // Forum soil SGS02Z — must NOT reclaim on climate_sensor
      '_TZE284_nt4pquef', '_tze284_nt4pquef', '_TZE284_NT4PQUEF',
    ],
    addAtTop: false,
    source: 'p92.91-issue-514',
  },
  // Forum #2133 PresentSky — BSEED dimmer wall socket was climate_sensor
  {
    id: 'p94-m1cvyneb-wall-dimmer-tuya',
    file: 'drivers/wall_dimmer_tuya/driver.compose.json',
    description: 'Forum #2133: _TZE284_m1cvyneb TS0601 BSEED dimmer socket',
    match: (mfrs) => mfrs.includes('_TZE284_m1cvyneb'),
    addIfMissing: ['_TZE284_m1cvyneb', '_tze284_m1cvyneb'],
    addAtTop: false,
    source: 'p94-forum-2133',
  },
  // Forum #2135 RoyceRoy — Avatto ZDMS16-2 2-gang dimmer (Z2M avatto.ts)
  {
    id: 'p96-jtbgusdc-dimmer-2-gang-tuya',
    file: 'drivers/dimmer_2_gang_tuya/driver.compose.json',
    description: 'Forum #2135: _TZE28C1000000_jtbgusdc / _TZE204_jtbgusdc Avatto ZDMS16-2',
    match: (mfrs) => mfrs.some((m) => /jtbgusdc|o9gyszw2|fjms2pi9/i.test(m)),
    addIfMissing: [
      '_TZE204_jtbgusdc', '_tze204_jtbgusdc', '_TZE204_JTBGUSDC',
      '_TZE284_jtbgusdc', '_tze284_jtbgusdc',
      '_TZE200_jtbgusdc', '_tze200_jtbgusdc',
      '_TZE28C1000000_jtbgusdc', '_tze28c1000000_jtbgusdc',
      '_TZE204_o9gyszw2', '_tze204_o9gyszw2',
      '_TZE284_o9gyszw2', '_tze284_o9gyszw2',
      '_TZE28C1000000_o9gyszw2', '_tze28c1000000_o9gyszw2',
      '_TZE204_fjms2pi9', '_tze204_fjms2pi9',
      '_TZE284_fjms2pi9', '_tze284_fjms2pi9',
      '_TZE28C1000000_fjms2pi9', '_tze28c1000000_fjms2pi9',
    ],
    addAtTop: false,
    source: 'p96-forum-2135',
  },
  // Forum #2129 Welshsmarthome — Scolmore ClickSmart dual socket (no metering)
  {
    id: 'p96-hlla45kx-double-power-point-2',
    file: 'drivers/double_power_point_2/driver.compose.json',
    description: 'Forum #2129: _TYZB01_hlla45kx TS011F Scolmore ClickSmart 2G socket',
    match: (mfrs) => mfrs.some((m) => /hlla45kx/i.test(m)),
    addIfMissing: ['_TYZB01_hlla45kx', '_tyzb01_hlla45kx', '_TYZB01_HLLA45KX', '_tyzb01_HLLA45KX'],
    addAtTop: false,
    source: 'p96-forum-2129',
  },
  {
    id: 'p96-hlla45kx-remove-button-wireless-2',
    file: 'drivers/button_wireless_2/driver.compose.json',
    description: 'Forum #2129: keep ClickSmart socket off button_wireless_2',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TYZB01_hlla45kx', '_tyzb01_hlla45kx', '_TYZB01_HLLA45KX', '_tyzb01_HLLA45KX'],
    addAtTop: false,
    source: 'p96-forum-2129',
  },
  {
    id: 'p96-hlla45kx-remove-generic',
    file: 'drivers/generic_tuya/driver.compose.json',
    description: 'Keep ClickSmart socket out of generic_tuya',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TYZB01_hlla45kx', '_tyzb01_hlla45kx', '_TYZB01_HLLA45KX'],
    addAtTop: false,
    source: 'p96-forum-2129',
  },
  // Forum soil / #2101 — awepdiwi must stay on soil_sensor
  {
    id: 'p97-awepdiwi-soil-sensor',
    file: 'drivers/soil_sensor/driver.compose.json',
    description: 'Forum/GH: _TZE284_awepdiwi TS0601 Smart Solar Soil Sensor',
    match: (mfrs) => mfrs.some((m) => /awepdiwi/i.test(m)),
    addIfMissing: ['_TZE284_awepdiwi', '_tze284_awepdiwi', '_TZE200_awepdiwi', '_TZE204_awepdiwi'],
    addAtTop: false,
    source: 'p97-forum-soil',
  },
  {
    id: 'p97-awepdiwi-remove-climate',
    file: 'drivers/climate_sensor/driver.compose.json',
    description: 'Keep awepdiwi off climate_sensor',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE284_awepdiwi', '_tze284_awepdiwi', '_TZE284_AWEPDIWI', '_tze284_AWEPDIWI'],
    addAtTop: false,
    source: 'p97-forum-soil',
  },
  {
    id: 'p98-myd45weu-remove-wall-switch-4',
    file: 'drivers/wall_switch_4_gang/driver.compose.json',
    description: 'Z2M TS0601_soil: keep myd45weu off wall_switch_4_gang',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: [
      '_TZE200_myd45weu', '_tze200_myd45weu', '_TZE200_MYD45WEU', '_tze200_MYD45WEU',
      '_TZE204_myd45weu', '_tze204_myd45weu', '_TZE284_myd45weu', '_tze284_myd45weu',
    ],
    addAtTop: false,
    source: 'p98-forum-soil',
  },
  // Forum #1610 Haadeess — rain sensor u6x1zyv2 (Z2M ZG-223Z)
  {
    id: 'p98-u6x1zyv2-rain-sensor',
    file: 'drivers/rain_sensor/driver.compose.json',
    description: 'Forum #1610: _TZE200_u6x1zyv2 TS0601 rain sensor',
    match: (mfrs) => mfrs.some((m) => /u6x1zyv2/i.test(m)),
    addIfMissing: ['_TZE200_u6x1zyv2', '_tze200_u6x1zyv2', '_TZE204_u6x1zyv2', '_tze204_u6x1zyv2'],
    addAtTop: false,
    source: 'p98-forum-1610',
  },
  {
    id: 'p98-u6x1zyv2-remove-contact',
    file: 'drivers/contact_sensor/driver.compose.json',
    description: 'Keep rain u6x1zyv2 off contact_sensor',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE200_u6x1zyv2', '_tze200_u6x1zyv2', '_TZE200_U6X1ZYV2', '_tze200_U6X1ZYV2'],
    addAtTop: false,
    source: 'p98-forum-1610',
  },
  {
    id: 'p98-pay2byax-remove-soil',
    file: 'drivers/soil_sensor/driver.compose.json',
    description: 'ZG-102ZL luminance door sensor is contact, not soil',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE200_pay2byax', '_tze200_pay2byax', '_TZE204_pay2byax', '_tze204_pay2byax'],
    addAtTop: false,
    source: 'p98-forum-contact-lux',
  },
  {
    id: 'p97-pcdmj88b-trv',
    file: 'drivers/thermostatic_radiator_valve/driver.compose.json',
    description: 'Forum #2106: _TZE284_pcdmj88b TS0601 TRV (Z2M thermostat_4)',
    match: (mfrs) => mfrs.some((m) => /pcdmj88b/i.test(m)),
    addIfMissing: ['_TZE284_pcdmj88b', '_tze284_pcdmj88b', '_TZE204_pcdmj88b', '_tze204_pcdmj88b'],
    addAtTop: false,
    source: 'p97-forum-2106',
  },
  {
    id: 'p97-pcdmj88b-remove-wall-thermostat',
    file: 'drivers/wall_thermostat/driver.compose.json',
    description: 'Keep pcdmj88b off wall_thermostat',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE284_pcdmj88b', '_tze284_pcdmj88b', '_TZE204_pcdmj88b', '_tze204_pcdmj88b', '_tze200_pcdmj88b'],
    addAtTop: false,
    source: 'p97-forum-2106',
  },
  {
    id: 'p97-dhotiauw-remove-generic',
    file: 'drivers/generic_tuya/driver.compose.json',
    description: 'Keep DIN rail meter dhotiauw out of generic_tuya',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE204_dhotiauw', '_tze204_dhotiauw', '_TZE284_dhotiauw', '_tze284_dhotiauw'],
    addAtTop: false,
    source: 'p97-forum-din',
  },
  // Forum #2130 Kanbros — BSEED 2-gang touch switch
  {
    id: 'p94-w5xztuy7-switch-2gang',
    file: 'drivers/switch_2gang/driver.compose.json',
    description: 'Forum #2130: _TZ3000_w5xztuy7 TS0002 BSEED 2-gang',
    match: (mfrs) => mfrs.includes('_TZ3000_w5xztuy7'),
    addIfMissing: ['_TZ3000_w5xztuy7', '_tz3000_w5xztuy7'],
    addAtTop: false,
    source: 'p94-forum-2130',
  },
  // Forum #2131 TBoy — 4ch relay claimed by switch_4gang
  {
    id: 'p94-imaccztn-relay-board-4',
    file: 'drivers/relay_board_4_channel/driver.compose.json',
    description: 'Forum #2131: _TZ3210_imaccztn TS0004 4-channel relay board',
    match: (mfrs) => mfrs.includes('_TZ3210_imaccztn') || mfrs.includes('_TZ3000_imaccztn'),
    addIfMissing: [
      '_TZ3210_imaccztn', '_tz3210_imaccztn',
      '_TZ3000_imaccztn', '_tz3000_imaccztn', '_TZ3000_u3oupgdy',
    ],
    addAtTop: false,
    source: 'p94-forum-2131',
  },
  {
    id: 'p94-imaccztn-remove-switch-4gang',
    file: 'drivers/switch_4gang/driver.compose.json',
    description: 'Forum #2131: keep _TZ3210_imaccztn off switch_4gang (relay board)',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: [
      '_TZ3210_imaccztn', '_tz3210_imaccztn', '_TZ3210_IMACCZTN', '_tz3210_IMACCZTN',
    ],
    addAtTop: false,
    source: 'p94-forum-2131',
  },
  {
    id: 'p94-remove-collisions-from-generic-tuya',
    file: 'drivers/generic_tuya/driver.compose.json',
    description: 'Forum #2133/#2131: keep routed FPs out of generic_tuya (TS0601 collision)',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: [
      '_TZE284_m1cvyneb', '_tze284_m1cvyneb', '_TZE284_M1CVYNEB', '_tze284_M1CVYNEB',
      '_TZ3210_imaccztn', '_tz3210_imaccztn', '_TZ3210_IMACCZTN', '_tz3210_IMACCZTN',
      '_TZE204_jtbgusdc', '_tze204_jtbgusdc', '_TZE284_jtbgusdc', '_tze284_jtbgusdc',
      '_TZE28C1000000_jtbgusdc', '_tze28c1000000_jtbgusdc',
      '_TZE204_o9gyszw2', '_tze204_o9gyszw2', '_TZE28C1000000_o9gyszw2',
      '_TZE204_fjms2pi9', '_tze204_fjms2pi9', '_TZE284_fjms2pi9', '_tze284_fjms2pi9',
      '_TZE28C1000000_fjms2pi9', '_tze28c1000000_fjms2pi9',
    ],
    addAtTop: false,
    source: 'p94-forum-collision',
  },
  // P217: HOBEIAN ZG-305Z must survive conflict resolve (sensor score beats switch).
  {
    id: 'p217-hobeian-zg305z-switch-2gang',
    file: 'drivers/switch_2gang/driver.compose.json',
    description: 'P217 Johan #1435: HOBEIAN ZG-305Z MHCOZY 2-gang USB switch',
    match: (mfrs) => Array.isArray(mfrs) && mfrs.some((m) => String(m).toLowerCase() === 'hobeian'),
    addIfMissing: ['HOBEIAN', 'hobeian', 'Hobeian'],
    addProductIds: ['ZG-305Z'],
    addAtTop: true,
    source: 'p217-johan-1435',
  },
  {
    id: 'p217-hobeian-zg305z-remove-button2',
    file: 'drivers/button_wireless_2/driver.compose.json',
    description: 'P217: ZG-305Z is a 2-gang switch, not a 2-button remote',
    match: () => true,
    addIfMissing: [],
    removeProductIds: ['ZG-305Z'],
    addAtTop: false,
    source: 'p217-johan-1435',
  },
  {
    id: 'p217-wfxuhoea-garage-door',
    file: 'drivers/garage_door/driver.compose.json',
    description: 'P217 Johan #1442: LoraTap garage _TZE200_wfxuhoea TS0601',
    match: (mfrs) => Array.isArray(mfrs) && mfrs.some((m) => /wfxuhoea/i.test(m)),
    addIfMissing: ['_TZE200_wfxuhoea', '_tze200_wfxuhoea', '_TZE204_wfxuhoea', '_tze204_wfxuhoea'],
    addAtTop: true,
    source: 'p217-johan-1442',
  },
  {
    id: 'p217-wfxuhoea-remove-button-plug',
    file: 'drivers/button_wireless_plug/driver.compose.json',
    description: 'P217: keep wfxuhoea off wireless plug',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZE200_wfxuhoea', '_tze200_wfxuhoea', '_TZE204_wfxuhoea', '_tze204_wfxuhoea'],
    addAtTop: false,
    source: 'p217-johan-1442',
  },
  {
    id: 'p217-k6fvknrr-double-power-point-2',
    file: 'drivers/double_power_point_2/driver.compose.json',
    description: 'P217 Johan PR #1437: _TZ3000_k6fvknrr TS011F dual outlet',
    match: (mfrs) => Array.isArray(mfrs) && mfrs.some((m) => /k6fvknrr/i.test(m)),
    addIfMissing: ['_TZ3000_k6fvknrr', '_tz3000_k6fvknrr'],
    addAtTop: false,
    source: 'p217-johan-1437',
  },
  {
    id: 'p217-k6fvknrr-remove-switch-1gang',
    file: 'drivers/switch_1gang/driver.compose.json',
    description: 'P217: keep k6fvknrr off 1-gang catch-all',
    match: () => true,
    addIfMissing: [],
    removeIfPresent: ['_TZ3000_k6fvknrr', '_tz3000_k6fvknrr'],
    addAtTop: false,
    source: 'p217-johan-1437',
  },
  {
    id: 'p217-wing-contact-sensor',
    file: 'drivers/contact_sensor/driver.compose.json',
    description: 'P217 Johan PR #1439: Wing TS0203 door/window',
    match: (mfrs) => Array.isArray(mfrs) && mfrs.some((m) => String(m).toLowerCase() === 'wing'),
    addIfMissing: ['Wing', 'wing', 'WING'],
    addProductIds: ['TS0203'],
    addAtTop: true,
    source: 'p217-johan-1439',
  },
  {
    id: 'p217-wing-climate-zth',
    file: 'drivers/climate_sensor/driver.compose.json',
    description: 'P217 Johan #1429/#1422: Wing ZTH11/ZTH13 climate — keep pids at top (combo compact)',
    match: (mfrs) => Array.isArray(mfrs) && mfrs.some((m) => String(m).toLowerCase() === 'wing'),
    addIfMissing: ['Wing', 'wing', 'WING'],
    addProductIds: ['ZTH11-3.0', 'ZTH13-3.0'],
    addAtTop: true,
    source: 'p217-johan-1429',
  },
];

function patchFix(fix) {
  const fp = path.join(ROOT, fix.file);
  if (!fs.existsSync(fp)) {
    console.log(`  ⚠️  ${fix.id}: file not found ${fix.file}`);
    return false;
  }
  const content = fs.readFileSync(fp, 'utf8');
  const j = JSON.parse(content);
  if (!j.zigbee) {
    console.log(`  ⚠️  ${fix.id}: no zigbee block`);
    return false;
  }

  let changed = false;
  let added = 0;
  let removed = 0;

  // Optional productId removals (e.g. ZG-222Z mis-routed onto gas sensor)
  if (Array.isArray(fix.removeProductIds) && Array.isArray(j.zigbee.productId)) {
    const ban = new Set(fix.removeProductIds.map((x) => String(x).toUpperCase()));
    const before = j.zigbee.productId.length;
    j.zigbee.productId = j.zigbee.productId.filter((p) => !ban.has(String(p).toUpperCase()));
    removed += before - j.zigbee.productId.length;
    if (before !== j.zigbee.productId.length) changed = true;
  }

  // P217: ensure unique pids survive conflict resolve / combo compact
  if (Array.isArray(fix.addProductIds)) {
    if (!Array.isArray(j.zigbee.productId)) j.zigbee.productId = [];
    const list = j.zigbee.productId;
    const upper = (p) => String(p).toUpperCase();
    for (const pid of fix.addProductIds) {
      const key = upper(pid);
      const idx = list.findIndex((p) => upper(p) === key);
      if (idx >= 0) {
        if (fix.addAtTop && idx > 0) {
          const [kept] = list.splice(idx, 1);
          list.unshift(kept);
          changed = true;
        }
        continue;
      }
      if (fix.addAtTop) list.unshift(pid);
      else list.push(pid);
      added++;
      changed = true;
    }
  }

  // Fixes that only touch productId may omit manufacturerName
  if (!Array.isArray(j.zigbee.manufacturerName)) {
    if (!changed) {
      console.log(`  ⚠️  ${fix.id}: no manufacturerName array`);
      return false;
    }
    fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
    console.log(`  ✅ ${fix.id}: removed ${removed} productId(s) from source '${fix.source}'`);
    return true;
  }

  const mfrs = j.zigbee.manufacturerName;
  const targetDriver = path.basename(path.dirname(fp));

  // P93: strip bot regressions / wrong-driver mfrs (case-insensitive)
  if (Array.isArray(fix.removeIfPresent) && fix.removeIfPresent.length) {
    const kept = mfrs.filter((m) => !includesCI(fix.removeIfPresent, m));
    removed += mfrs.length - kept.length;
    if (kept.length !== mfrs.length) {
      j.zigbee.manufacturerName = kept;
      changed = true;
    }
  }

  const liveMfrs = j.zigbee.manufacturerName;
  const addList = Array.isArray(fix.addIfMissing) ? fix.addIfMissing : [];
  // P92.126 collision guard: skip mfrs another driver already claims
  // (HOBEIAN exempt — multi-driver by design, see fp-collision-guard.js)
  const guarded = addList.filter((m) => {
    if (includesCI(liveMfrs, m)) return false;
    const owner = claimedElsewhere(ROOT, m, targetDriver);
    if (owner) {
      console.log(`  ~ ${fix.id}: skip ${m} — already claimed by ${owner}`);
      return false;
    }
    return true;
  });
  // P75.26: do NOT short-circuit on match() — the auto-fix-all bot can leave
  // the anchor mfr while removing siblings. We must always check addIfMissing.
  for (const m of guarded) {
    if (!includesCI(liveMfrs, m)) {
      if (fix.addAtTop) liveMfrs.unshift(m);
      else liveMfrs.push(m);
      added++;
      changed = true;
    }
  }

  // P99: expand Homey-critical case forms for every injected / present fix mfr
  const beforeVariants = liveMfrs.length;
  const { list: withVariants, added: variantAdded } = mergeManufacturerCaseVariants(liveMfrs);
  if (variantAdded > 0) {
    j.zigbee.manufacturerName = withVariants;
    added += variantAdded;
    changed = true;
    console.log(`  · ${fix.id}: +${variantAdded} case variants (${beforeVariants}→${withVariants.length})`);
  }

  if (!changed) {
    if (typeof fix.match === 'function' && fix.match(liveMfrs)) return false;
    return false;
  }
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
  console.log(
    `  ✅ ${fix.id} (${fix.description}): +${added} / -${removed} from source '${fix.source}'`
  );
  return true;
}

let total = 0;
let applied = 0;
console.log('═══════════════════════════════════════════════');
console.log('  🔁 RE-INJECT MANUAL FIXES (P63.3)');
console.log('═══════════════════════════════════════════════');
for (const fix of MANUAL_FIXES) {
  total++;
  if (patchFix(fix)) applied++;
}
console.log(`\nApplied: ${applied}/${total} manual fixes re-injected`);
process.exit(0);
