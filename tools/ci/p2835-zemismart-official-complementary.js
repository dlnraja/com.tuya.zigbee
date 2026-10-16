#!/usr/bin/env node
'use strict';

/**
 * P2835 — Official Zemismart Homey app + ZHA quirks → OUR drivers (UNION).
 *
 * Sources (no invent pid):
 *  - https://homey.app/fr-fr/app/com.zemismart.iot/Zemismart/ (v2.0.33 catalog)
 *  - https://homey.app/fr-fr/apps/author/673ecee0a57316856e9aea27/page/0/
 *  - github.com/zemismart-dev/zemismart-zha-quirks README (exact mfr+pid)
 *
 * WHY: Screen switches / ZMD dimmers / motors bleed onto climate / TRV / air_purifier.
 * HOW: Surgical REMOVE from wrong drivers + UNION onto correct class; dual-case forms.
 * CONTRE QUOI: invent pid; wipe compose; leave ZMS-206 on climate_sensor.
 *
 *   node tools/ci/p2835-zemismart-official-complementary.js
 *   node tools/ci/p2835-zemismart-official-complementary.js --apply
 */

const fs = require('fs');
const path = require('path');
const { appendExactIdentityForms } = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT = path.join(ROOT, 'reports', 'zemismart-official-2026-10-16');

function dual(mfr) {
  const s = String(mfr).trim();
  if (!s) return [];
  const lo = s.toLowerCase();
  const up = lo.replace(
    /^(_tze28c1000000|_tze2841000000|_tze284|_tze204|_tze200|_tz3000|_tz3290|_tz3002)/i,
    (p) => p.toUpperCase(),
  );
  return [...new Set([s, lo, up])];
}

/**
 * Couples from zemismart-zha-quirks README + Homey store device class.
 * pid never invented — only listed beside mfr in upstream table.
 */
const UNION = [
  // ZM16B / ZMP1 / ZM90E / ZM25Z covers
  { driver: 'curtain_motor', pid: ['TS0601'], mfr: ['_TZE284_6hrnp30w', '_TZE284_fzo2pocs', '_TZE2841000000_3mzb0sdz', '_TZE284_3mzb0sdz'] },
  { driver: 'curtain_motor', pid: ['TS0301'], mfr: ['_TZE200_cirjrpxe'] },
  // ZPS-Z1 presence
  { driver: 'presence_sensor_radar', pid: ['TS0601'], mfr: ['_TZE284_ft7qqpx3'] },
  // 214C water meter valve
  { driver: 'water_valve_smart', pid: ['TS0601'], mfr: ['_TZE284_vuwtqx0t', '_TZE200_vuwtqx0t', '_TZE2841000000_zm8zpwas'] },
  // Heat meter
  { driver: 'ultrasonic_heat_meter', pid: ['TS0601'], mfr: ['_TZE200_jt50ea5d'] },
  // ZMD-206 screen dimmers
  { driver: 'dimmer_1_gang_tuya', pid: ['TS0601'], mfr: ['_TZE284_5aico93l', '_TZE28C1000000_5aico93l'] },
  { driver: 'dimmer_2_gang_tuya', pid: ['TS0601'], mfr: ['_TZE284_pyh4zt7w'] },
  { driver: 'dimmer_3gang', pid: ['TS0601'], mfr: ['_TZE284_k9e7ihec', '_TZE28C1000000_k9e7ihec', '_TZE204_znvwzxkq', '_TZE284_znvwzxkq'] },
  // ZMS-206 / ZMS-208 screen switches (1–4 gang)
  { driver: 'wall_switch_1_gang_tuya', pid: ['TS0601'], mfr: ['_TZE284_lnyz4a6v', '_TZE284_1tnysxwl', '_TZE284_rzdkn5rx'] },
  { driver: 'switch_2gang', pid: ['TS0601'], mfr: [
    '_TZE284_dmckrsxg', '_TZE284_a2teqi5u', '_TZE204_3ctwoaip', '_TZE284_3ctwoaip',
    '_TZE28C1000000_a2teqi5u', '_TZE28C1000000_dmckrsxg',
    '_TZE284_o409r73p', '_TZE28C1000000_o409r73p',
  ] },
  { driver: 'switch_3gang', pid: ['TS0601'], mfr: [
    '_TZE284_e4pf6l87', '_TZE284_xvywzhmi',
    '_TZE28C1000000_e4pf6l87', '_TZE28C1000000_xvywzhmi',
    '_TZE284_oy1nuaa5',
  ] },
  { driver: 'switch_4gang', pid: ['TS0601'], mfr: [
    '_TZE284_y4jqpry8', '_TZE284_xibaabmu',
    '_TZE28C1000000_y4jqpry8', '_TZE28C1000000_xibaabmu',
    '_TZE204_xibaabmu',
  ] },
  // ZN2S scene switches (EF00)
  { driver: 'wall_switch_1_gang_tuya', pid: ['TS0601'], mfr: ['_TZE200_ephrk8to'] },
  { driver: 'switch_2gang', pid: ['TS0601'], mfr: ['_TZE200_ahyyfhqk'] },
  { driver: 'switch_3gang', pid: ['TS0601'], mfr: ['_TZE200_zuphzsmo'] },
  { driver: 'switch_4gang', pid: ['TS0601'], mfr: ['_TZE200_6si1pnia'] },
  // KES606 composite (TS0726)
  { driver: 'switch_1gang', pid: ['TS0726'], mfr: ['_TZ3000_ovbvmhiq'] },
  { driver: 'switch_2gang', pid: ['TS0726'], mfr: ['_TZ3000_icoxotza'] },
  { driver: 'switch_3gang', pid: ['TS0726'], mfr: ['_TZ3000_hurauima'] },
  { driver: 'button_wireless_4', pid: ['TS0044'], mfr: ['_TZ3000_xwuveizv'] },
  { driver: 'ir_blaster', pid: ['TS1201'], mfr: ['_TZ3290_qazgdsae'] },
];

/** Wrong placements → strip mfr (same mfr+wrong class). Never wipe arrays. */
const STRIP = [
  {
    driver: 'climate_sensor',
    suffixes: ['3ctwoaip', 'y4jqpry8', 'e4pf6l87', 'xvywzhmi', 'xibaabmu', 'dmckrsxg', 'a2teqi5u', 'lnyz4a6v', '1tnysxwl'],
    why: 'ZMS-206/208 screen switches ≠ climate (Zemismart ZHA + Homey com.zemismart.iot)',
  },
  {
    driver: 'device_air_purifier_plug',
    suffixes: ['lnyz4a6v', '1tnysxwl'],
    why: 'ZMS-206 1-gang screen switch ≠ air purifier plug',
  },
  {
    driver: 'curtain_motor',
    suffixes: ['o409r73p'],
    why: 'ZM609 metering screen switch ≠ curtain (zemismart-zha-quirks zmz609.py)',
  },
  {
    driver: 'device_radiator_valve',
    suffixes: ['zm8zpwas'],
    why: 'PF-PM07D water valve ≠ TRV (zemismart-zha-quirks pm07db_tyz.py)',
  },
  {
    driver: 'switch_1gang',
    suffixes: ['a2teqi5u', 'dmckrsxg'],
    why: 'ZMS-206/208 2-gang screen → switch_2gang (not 1-gang)',
  },
  {
    driver: 'boiler_switch_energy',
    suffixes: ['rzdkn5rx'],
    why: 'ZN2S-US01U-ZK 1-gang screen switch → wall_switch_1_gang_tuya',
  },
];

function loadCompose(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  return { path: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function saveCompose(filePath, json) {
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function stripSuffixes(compose, suffixes) {
  const z = compose.zigbee || (compose.zigbee = {});
  const before = (z.manufacturerName || []).length;
  z.manufacturerName = (z.manufacturerName || []).filter((m) => {
    const lo = String(m).toLowerCase();
    return !suffixes.some((s) => lo.includes(String(s).toLowerCase()));
  });
  return before - z.manufacturerName.length;
}

function unionCouple(compose, mfrs, pids) {
  const z = compose.zigbee || (compose.zigbee = {});
  const mIn = [];
  for (const m of mfrs) mIn.push(...dual(m));
  const beforeM = (z.manufacturerName || []).length;
  const beforeP = (z.productId || []).length;
  z.manufacturerName = appendExactIdentityForms(z.manufacturerName || [], mIn);
  z.productId = appendExactIdentityForms(z.productId || [], pids);
  return {
    mfrAdded: z.manufacturerName.length - beforeM,
    pidAdded: z.productId.length - beforeP,
  };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    source: {
      homeyApp: 'https://homey.app/fr-fr/app/com.zemismart.iot/Zemismart/',
      author: 'https://homey.app/fr-fr/apps/author/673ecee0a57316856e9aea27/page/0/',
      zhaQuirks: 'https://github.com/zemismart-dev/zemismart-zha-quirks',
      liveVersion: '2.0.33',
    },
    apply: APPLY,
    strips: [],
    unions: [],
  };

  for (const s of STRIP) {
    const loaded = loadCompose(s.driver);
    if (!loaded) {
      report.strips.push({ driver: s.driver, error: 'missing' });
      continue;
    }
    const removed = stripSuffixes(loaded.json, s.suffixes);
    report.strips.push({ driver: s.driver, removed, why: s.why });
    if (APPLY && removed > 0) saveCompose(loaded.path, loaded.json);
  }

  for (const u of UNION) {
    const loaded = loadCompose(u.driver);
    if (!loaded) {
      report.unions.push({ driver: u.driver, error: 'missing' });
      continue;
    }
    const r = unionCouple(loaded.json, u.mfr, u.pid);
    report.unions.push({ driver: u.driver, pid: u.pid, mfr: u.mfr, ...r });
    if (APPLY && (r.mfrAdded || r.pidAdded)) saveCompose(loaded.path, loaded.json);
  }

  fs.writeFileSync(path.join(OUT, 'p2835-report.json'), JSON.stringify(report, null, 2));
  const stripped = report.strips.reduce((n, x) => n + (x.removed || 0), 0);
  const added = report.unions.reduce((n, x) => n + (x.mfrAdded || 0) + (x.pidAdded || 0), 0);
  console.log(JSON.stringify({
    mode: APPLY ? 'APPLY' : 'DRY',
    stripped,
    added,
    out: path.join(OUT, 'p2835-report.json'),
  }, null, 2));
}

main();
