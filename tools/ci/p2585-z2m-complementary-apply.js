#!/usr/bin/env node
'use strict';
/**
 * P2585b — Context-aware Z2M→Homey complementary couple apply (dry by default).
 * Reads tuya.ts dump, classifies Z2M-only (mfr+pid) by nearby description, unions into compose.
 *
 *   node tools/ci/p2585-z2m-complementary-apply.js           # dry-run
 *   node tools/ci/p2585-z2m-complementary-apply.js --apply   # write compose + mfs soft
 */
const fs = require('fs');
const path = require('path');
const { unionStrings } = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const OUT_DIR = path.join(ROOT, 'reports', 'z2m-homey-couple-diff-2026-09-18');

function findTuyaDump() {
  const arg = process.argv.find((a) => a.startsWith('--tuya-src='));
  if (arg) return arg.slice('--tuya-src='.length);
  const dump = path.join(
    process.env.USERPROFILE || '',
    '.cursor/projects/c-Users-Dell-Documents-homey-master/agent-tools/e6ee55a0-e612-466c-bd21-448433558292.txt',
  );
  return fs.existsSync(dump) ? dump : null;
}

function parseCouples(src) {
  const couples = [];
  const fpRe = /fingerprint:\s*tuya\.fingerprint\(['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\)/g;
  let m;
  while ((m = fpRe.exec(src))) {
    const pid = m[1];
    const mfrs = [...m[2].matchAll(/['"](_T[^'"]+)['"]/g)].map((x) => x[1]);
    const after = src.slice(m.index, m.index + 800);
    const model = (after.match(/model:\s*["']([^"']+)["']/) || [])[1] || '';
    const desc = (after.match(/description:\s*["']([^"']+)["']/) || [])[1] || '';
    for (const mfr of mfrs) couples.push({ mfr, pid, model, desc, via: 'fingerprint()' });
  }
  return couples;
}

function classify(c) {
  const s = `${c.mfr} ${c.pid} ${c.model} ${c.desc}`.toLowerCase();
  // Forbid ambiguous / dangerous auto routes
  if (/soil|plant/.test(s)) return { driver: 'soil_sensor', conf: 0.9 };
  if (/gas/.test(s)) return { driver: 'gas_sensor', conf: 0.9 };
  if (/smoke/.test(s)) return { driver: 'smoke_sensor', conf: 0.9 };
  if (/water.?leak|flood|rain/.test(s)) return { driver: 'water_leak_sensor', conf: 0.9 };
  if (/curtain|cover|blind|shade|roller|tubular/.test(s)) return { driver: 'curtain_motor', conf: 0.95 };
  if (/presence|radar|mmwave|occupancy|human presence/.test(s)) return { driver: 'presence_sensor_radar', conf: 0.95 };
  if (/thermostat|trv|radiator/.test(s)) return { driver: 'thermostat', conf: 0.85 };
  if (/dimmer/.test(s)) return { driver: 'wall_dimmer_tuya', conf: 0.85 };
  if (/plug|socket|outlet/.test(s) && /TS011F/i.test(c.pid)) return { driver: 'plug_energy_monitor', conf: 0.9 };
  if (/sos|emergency|panic/.test(s) || /TS0215/i.test(c.pid)) return { driver: 'button_emergency_sos', conf: 0.85 };
  if (/motion|pir/.test(s) && /TS0202/i.test(c.pid)) return { driver: 'motion_sensor', conf: 0.85 };
  if (/contact|door|window/.test(s)) return { driver: 'contact_sensor', conf: 0.85 };
  if (/knob|rotary/.test(s)) return { driver: 'smart_knob', conf: 0.8 };
  if (/scene|remote|button/.test(s) && /TS004/i.test(c.pid)) return { driver: 'button_wireless_4', conf: 0.75 };
  if (/TS0001/i.test(c.pid) && /switch|relay|gang/.test(s)) return { driver: 'switch_1gang', conf: 0.8 };
  if (/TS0002/i.test(c.pid) && /switch|relay|gang/.test(s)) return { driver: 'switch_2gang', conf: 0.8 };
  if (/TS0003/i.test(c.pid)) return { driver: 'wall_switch_3gang_1way', conf: 0.7 };
  if (/TS0004/i.test(c.pid)) return { driver: 'wall_switch_4gang_1way', conf: 0.7 };
  if (/valve|irrigation/.test(s)) return { driver: 'water_valve_smart', conf: 0.8 };
  if (/climate|temperature|humidity|temp.?hum/.test(s)) return { driver: 'climate_sensor', conf: 0.75 };
  // pid-only soft (lower conf — not auto-apply)
  if (/^TS011F$/i.test(c.pid)) return { driver: 'plug_energy_monitor', conf: 0.55 };
  if (/^TS0001$/i.test(c.pid)) return { driver: 'switch_1gang', conf: 0.5 };
  if (/^TS0002$/i.test(c.pid)) return { driver: 'switch_2gang', conf: 0.5 };
  if (/^TS0202$/i.test(c.pid)) return { driver: 'motion_sensor', conf: 0.5 };
  if (/^TS0601$/i.test(c.pid)) return { driver: null, conf: 0 };
  return { driver: null, conf: 0 };
}

function loadOursMfrPid() {
  const map = new Map();
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let c;
    try { c = JSON.parse(fs.readFileSync(p)); } catch { continue; }
    const mfrs = c.zigbee?.manufacturerName || [];
    const pids = c.zigbee?.productId || [];
    for (const mfr of mfrs) {
      for (const pid of pids) {
        map.set(`${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`, d);
      }
    }
  }
  return map;
}

function unionCompose(driverId, mfr, pid) {
  const p = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return { ok: false, reason: 'missing-driver' };
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!c.zigbee) c.zigbee = {};
  const beforeM = (c.zigbee.manufacturerName || []).length;
  const beforeP = (c.zigbee.productId || []).length;
  // Case variants for Homey matching
  const variants = [
    mfr,
    mfr.toLowerCase(),
    mfr.toUpperCase().replace(/^_TZE/, '_TZE').replace(/^_TZ/, '_TZ'),
  ];
  // Proper case forms
  const forms = new Set([mfr]);
  if (/^_tze/i.test(mfr)) {
    const body = mfr.replace(/^_tze/i, '');
    forms.add(`_TZE${body}`);
    forms.add(`_tze${body.toLowerCase()}`);
    forms.add(`_TZE${body.toUpperCase()}`);
  } else if (/^_tz/i.test(mfr)) {
    const body = mfr.slice(3);
    forms.add(`_TZ${body}`);
    forms.add(`_tz${body.toLowerCase()}`);
  }
  c.zigbee.manufacturerName = unionStrings(c.zigbee.manufacturerName || [], [...forms]);
  c.zigbee.productId = unionStrings(c.zigbee.productId || [], [pid]);
  const afterM = c.zigbee.manufacturerName.length;
  const afterP = c.zigbee.productId.length;
  if (APPLY && (afterM > beforeM || afterP > beforeP)) {
    fs.writeFileSync(p, `${JSON.stringify(c, null, 2)}\n`);
  }
  return {
    ok: true,
    driverId,
    addedMfr: afterM - beforeM,
    addedPid: afterP - beforeP,
    wrote: APPLY && (afterM > beforeM || afterP > beforeP),
  };
}

function main() {
  const dump = findTuyaDump();
  if (!dump) {
    console.error('[p2585b] no tuya.ts dump — fetch herdsman tuya.ts first');
    process.exit(1);
  }
  const src = fs.readFileSync(dump, 'utf8');
  const couples = parseCouples(src);
  const ours = loadOursMfrPid();
  const candidates = [];
  const seen = new Set();

  for (const c of couples) {
    const k = `${c.mfr.toLowerCase()}|${c.pid.toUpperCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (ours.has(k)) continue;
    // Skip weird 1000000 synthetic prefixes unless gas/known
    const cls = classify(c);
    candidates.push({ ...c, ...cls, key: k });
  }

  const applySafe = candidates.filter((c) => c.driver && c.conf >= 0.8);
  const soft = candidates.filter((c) => c.driver && c.conf >= 0.5 && c.conf < 0.8);
  const skip = candidates.filter((c) => !c.driver || c.conf < 0.5);

  const results = [];
  for (const c of applySafe) {
    results.push({ ...c, result: unionCompose(c.driver, c.mfr, c.pid) });
  }

  const report = {
    generated: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    dump,
    totals: {
      z2mParsed: seen.size,
      missing: candidates.length,
      applySafe: applySafe.length,
      soft: soft.length,
      skip: skip.length,
    },
    applied: results,
    softSample: soft.slice(0, 40),
    skipSample: skip.slice(0, 40),
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'APPLY.json'), JSON.stringify(report, null, 2));

  console.log(`[p2585b] mode=${report.mode} missing=${candidates.length} applySafe=${applySafe.length} soft=${soft.length}`);
  for (const r of results.slice(0, 30)) {
    console.log(`  ${r.wrote ? 'WROTE' : 'OK'} ${r.mfr}+${r.pid} → ${r.driver} (${r.model || r.desc || ''}) +mfr=${r.result.addedMfr}`);
  }
}

main();
