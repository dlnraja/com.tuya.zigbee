#!/usr/bin/env node
'use strict';

/**
 * P2571 — T26439 (Johan thread) → OUR app complementary enrich (silent).
 *
 * WHY: Harvest tip #5514 messages+images; lock verified (mfr,pid) into Universal Tuya.
 * HOW: Curated LOCK/MOVE matrix (Z2M+forum) + ComplementaryMerge dual-case union.
 * POUR QUI: BOTH (reliability FP). Never Johan repo. Never forum POST.
 * QUAND: After p2571-t26439-deep-harvest.js
 * CONTRE QUOI: Misroute knob→1gang / Hejhome→3gang ZCL; invent pid; shrink caps.
 *
 *   node tools/ci/p2571-t26439-complementary-enrich.js
 *   node tools/ci/p2571-t26439-complementary-enrich.js --apply
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const {
  appendExactIdentityForms,
} = require('../../lib/enrichment/ComplementaryMerge');

/** Verified tip couples → target driver (union only). */
const LOCKS = [
  // Soil family (Remco / Martin / Haadeess / darckrie)
  { driver: 'soil_sensor', mfrs: ['_TZE284_myd45weu', '_TZE204_myd45weu', '_TZE200_myd45weu', '_TZE284_oitavov2', '_TZE200_npj9bug3', '_TZE284_aao3yzhs', '_TZE284_nt4pquef'], pids: ['TS0601'] },
  // Radar / presence (Riccardo / Alejandro / Z2M)
  { driver: 'presence_sensor_radar', mfrs: ['_TZE204_ex3rcdha', '_TZE284_debczeci', '_TZE204_debczeci', '_TZE284_1lvln0x6'], pids: ['TS0601'] },
  // Bed pressure pad (DaPicard / Z2M TS0601_bed_presence_sensor)
  { driver: 'bed_sensor', mfrs: ['_TZE200_seq9cm6u', '_TZE204_seq9cm6u', '_TZE284_seq9cm6u'], pids: ['TS0601'] },
  // Lux outdoor (Tobias-B)
  { driver: 'light_sensor_outdoor', mfrs: ['_TZE284_aaeasoll', '_TZE204_aaeasoll', '_TZE200_aaeasoll'], pids: ['TS0601'] },
  // LCD TH (Peter / Z2M TH05Z)
  { driver: 'lcdtemphumidsensor', mfrs: ['_TZE200_vvmbj46n', '_TZE204_vvmbj46n', '_TZE284_vvmbj46n'], pids: ['TS0601'] },
  // Hejhome Pika 3+6 gang EF00 (Trey) — 6-gang driver is superset
  { driver: 'wall_switch_6_gang_tuya', mfrs: ['_TZE284_c8ipbljq', '_TZE204_c8ipbljq', '_TZE200_c8ipbljq'], pids: ['TS0601'] },
  // TS0601 knob dimmer (Hogar / Z2M TS0601_knob_dimmer_switch)
  { driver: 'wall_dimmer_tuya', mfrs: ['_TZE284_tgeqdjgk', '_TZE200_tgeqdjgk', '_TZE204_tgeqdjgk'], pids: ['TS0601'] },
  // Garden irrigation quotes (Kai / Johan list)
  { driver: 'smart_garden_irrigation_control', mfrs: ['_TZ3210_eymunffl', '_TZ3000_cjfmu5he', '_TZ3000_kz1anoi8', '_TZ3000_mq4wujmp'], pids: ['TS0101', 'TS0049'] },
];

/** Same (mfr,pid) must leave these drivers (wrong class / collision bleed). */
const MOVES = [
  { mfrTail: 'c8ipbljq', removeFrom: ['switch_3gang', 'switch_1gang', 'switch_4gang', 'wall_switch_4_gang_tuya'], keepIn: 'wall_switch_6_gang_tuya' },
  { mfrTail: 'tgeqdjgk', removeFrom: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'smart_knob'], keepIn: 'wall_dimmer_tuya' },
  { mfrTail: 'vvmbj46n', removeFrom: ['lcdtemphumidsensor_3'], keepIn: 'lcdtemphumidsensor' },
  { mfrTail: 'ex3rcdha', removeFrom: ['wall_switch_4_gang_tuya', 'switch_4gang', 'soil_sensor'], keepIn: 'presence_sensor_radar' },
  { mfrTail: 'seq9cm6u', removeFrom: ['contact_sensor', 'contact_sensor_zigbee'], keepIn: 'bed_sensor' },
];

function dualCaseForms(mfr) {
  const s = String(mfr || '').trim();
  if (!s) return [];
  const forms = new Set([s]);
  if (s.startsWith('_')) {
    forms.add(`_${s.slice(1).toLowerCase()}`);
    forms.add(`_${s.slice(1).toUpperCase()}`);
    const m = s.match(/^(_T[YZ][A-Z0-9]*_)(.+)$/i);
    if (m) {
      forms.add(`${m[1].toUpperCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toLowerCase()}${m[2].toLowerCase()}`);
      forms.add(`${m[1].toUpperCase()}${m[2].toUpperCase()}`);
    }
  }
  return [...forms];
}

function loadCompose(driverId) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  return { path: p, json: JSON.parse(fs.readFileSync(p, 'utf8')) };
}

function saveCompose(filePath, json) {
  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

function stripMfrTail(compose, tail) {
  const z = compose.zigbee || {};
  const before = (z.manufacturerName || []).length;
  const t = String(tail).toLowerCase();
  // WHY: only match manufacturerName suffix after last underscore (sacred couple tail).
  z.manufacturerName = (z.manufacturerName || []).filter((m) => {
    const parts = String(m).split('_');
    const last = parts[parts.length - 1].toLowerCase();
    return last !== t;
  });
  compose.zigbee = z;
  return before - z.manufacturerName.length;
}

function applyLocks() {
  const report = { locks: [], moves: [], errors: [] };
  for (const lock of LOCKS) {
    const loaded = loadCompose(lock.driver);
    if (!loaded) {
      report.errors.push(`missing driver ${lock.driver}`);
      continue;
    }
    const { path: fp, json } = loaded;
    json.zigbee = json.zigbee || {};
    const forms = [];
    for (const m of lock.mfrs) forms.push(...dualCaseForms(m));
    const beforeM = (json.zigbee.manufacturerName || []).length;
    const beforeP = (json.zigbee.productId || []).length;
    json.zigbee.manufacturerName = appendExactIdentityForms(json.zigbee.manufacturerName, forms);
    json.zigbee.productId = appendExactIdentityForms(json.zigbee.productId, lock.pids);
    const addedM = json.zigbee.manufacturerName.length - beforeM;
    const addedP = json.zigbee.productId.length - beforeP;
    report.locks.push({ driver: lock.driver, addedM, addedP, mfrs: lock.mfrs, pids: lock.pids });
    if (APPLY && (addedM || addedP)) saveCompose(fp, json);
  }

  for (const mv of MOVES) {
    for (const drv of mv.removeFrom) {
      const loaded = loadCompose(drv);
      if (!loaded) continue;
      const { path: fp, json } = loaded;
      const removed = stripMfrTail(json, mv.mfrTail);
      if (removed > 0) {
        report.moves.push({ from: drv, keepIn: mv.keepIn, tail: mv.mfrTail, removed });
        if (APPLY) saveCompose(fp, json);
      }
    }
  }
  return report;
}

function main() {
  const report = applyLocks();
  const outDir = path.join(ROOT, 'reports', `forum-t26439-${new Date().toISOString().slice(0, 10)}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'ENRICH.json'), `${JSON.stringify({ id: 'P2571', apply: APPLY, ...report }, null, 2)}\n`);
  console.log(`[P2571] mode=${APPLY ? 'APPLY' : 'DRY'} locks=${report.locks.length} moves=${report.moves.length} errors=${report.errors.length}`);
  for (const m of report.moves) console.log(`  MOVE -${m.removed} ${m.tail} from ${m.from} → keep ${m.keepIn}`);
  for (const l of report.locks.filter((x) => x.addedM || x.addedP)) {
    console.log(`  LOCK +mfr=${l.addedM} +pid=${l.addedP} → ${l.driver}`);
  }
  if (!APPLY) console.log('[P2571] re-run with --apply to write');
}

main();
