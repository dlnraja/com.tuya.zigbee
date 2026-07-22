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

const ROOT = path.resolve(__dirname, '..', '..');

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
  // P75.18-22: Forum-routing test mfrs (must be in driver, not just switch_1gang catch-all)
  {
    id: 'p75.18-button-wireless-4-mfrs',
    file: 'drivers/button_wireless_4/driver.compose.json',
    description: 'P75.18-22: Forum-routing test mfrs (auto-fix-all reverts these)',
    match: (mfrs) => mfrs.includes('_TZ3000_kfu8zapd'),
    addIfMissing: [
      '_TZ3000_u3nv1jwk',
      '_TZ3000_kfu8zapd',
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_rco1yzb1',
      '_TZ3000_abrsvsou',
      '_TZ3000_4fjiwweb',
    ],
    addAtTop: false,
    source: 'p75.18-forum-routing',
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
  // P80: 685 missing mfrs from issue #439 auto-scan - go to generic_tuya
  // The auto-publish bot often reverts mfr additions on driver.compose.json
  // We re-add them here. The set is large but stable (it comes from issue body).
  // Use a marker: if at least one of the new mfrs is present, treat as complete.
  {
    id: 'p80-issue-439-generic-tuya-fps',
    file: 'drivers/generic_tuya/driver.compose.json',
    description: 'P80: 685 mfrs from issue #439 (Zigbee2MQTT auto-scan, 2026-07-01)',
    match: (mfrs) => mfrs.includes('_TYST11_fzo2pocs') && mfrs.includes('_TZE200_2hf7x9n3'),
    addIfMissing: [
      // Sample marker - the real bulk apply is via apply-issue-439-fps.js
      // We only add 2 anchor mfrs to detect if the bot reverted. The full
      // set is too large to put in this file. Re-run apply-issue-439-fps.js
      // if these are missing.
      '_TYST11_fzo2pocs', '_TZE200_2hf7x9n3',
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
    addIfMissing: ['_TYZB01_4TLKSK8A', '_TZE200_BXOO2SWD', '_TZ3000_hyarhbyx', '_TZ3000_gjrubzje', '_TZ3000_wpueorev'],
    addAtTop: false,
    source: 'p80-orphan',
  },
  {
    id: 'p80-orphan-wall-switch-5-gang-tuya',
    file: 'drivers/wall_switch_5_gang_tuya/driver.compose.json',
    description: 'P80: wall_switch_5_gang_tuya mfrs (socket orphan, TS0011/ZBMINI/etc.)',
    match: (mfrs) => mfrs.includes('_TZE200_7TDTQGWV'),
    addIfMissing: ['_TZE200_7TDTQGWV', '_TYZB01_QEQVMVTI', '_TZ3000_aetquff4', '_TZ3000_hafsqare', '_TZE200_3P5YDOS3'],
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
  {
    id: 'p80.5-orphan-switch-usb-dongle',
    file: 'drivers/switch_usb_dongle/driver.compose.json',
    description: 'P80.5: switch_usb_dongle mfrs (socket orphan, TS0002)',
    match: (mfrs) => mfrs.includes('_TZE200_BXOO2SWD'),
    addIfMissing: ['_TZE200_BXOO2SWD', '_TZ3000_Itgngnqz', '_TZ3000_kgxej1dv', '_TZ3000_ywubfuvt'],
    addAtTop: false,
    source: 'p80.5-orphan',
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
  if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) {
    console.log(`  ⚠️  ${fix.id}: no manufacturerName array`);
    return false;
  }
  const mfrs = j.zigbee.manufacturerName;
  // P75.26: do NOT short-circuit on match() — the auto-fix-all bot can leave
  // the anchor mfr while removing siblings. We must always check addIfMissing.
  // Add missing fingerprints
  let added = 0;
  for (const fp of fix.addIfMissing) {
    if (!mfrs.includes(fp)) {
      if (fix.addAtTop) {
        mfrs.unshift(fp);
      } else {
        mfrs.push(fp);
      }
      added++;
    }
  }
  if (added === 0) {
    if (fix.match(mfrs)) {
      return false; // already complete
    }
    // match() returns false but no addIfMissing gaps: skip silently
    return false;
  }
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
  console.log(`  ✅ ${fix.id} (${fix.description}): added ${added} FP(s) from source '${fix.source}'`);
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
