#!/usr/bin/env node
'use strict';
/**
 * P2585 — Diff Z2M herdsman tuya fingerprints (mfr+pid) vs Homey drivers.
 * Complementary only — never invent pid; report apply-safe candidates.
 *
 * Usage:
 *   node tools/ci/p2585-z2m-herdsman-couple-diff.js [--tuya-src=path]
 *   TUYA_SRC can be a raw tuya.ts dump; else uses data/z2m_herdsman_cache.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'reports', 'z2m-homey-couple-diff-2026-09-18');
fs.mkdirSync(OUT_DIR, { recursive: true });

function loadOurs() {
  const ours = new Map(); // key -> drivers[]
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    let c;
    try { c = JSON.parse(fs.readFileSync(p)); } catch { continue; }
    const mfrs = c.zigbee?.manufacturerName || [];
    const pids = c.zigbee?.productId || [];
    for (const mfr of mfrs) {
      for (const pid of pids) {
        const k = `${String(mfr).toLowerCase()}|${String(pid).toUpperCase()}`;
        if (!ours.has(k)) ours.set(k, new Set());
        ours.get(k).add(d);
      }
    }
  }
  return ours;
}

function parseTuyaTs(src) {
  const couples = [];
  const fpRe = /fingerprint:\s*tuya\.fingerprint\(['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\)/g;
  let m;
  while ((m = fpRe.exec(src))) {
    const pid = m[1];
    const mfrs = [...m[2].matchAll(/['"](_T[^'"]+)['"]/g)].map((x) => x[1]);
    for (const mfr of mfrs) couples.push({ mfr, pid, via: 'fingerprint()' });
  }
  const objRe = /\{\s*modelID:\s*['"]([^'"]+)['"]\s*,\s*manufacturerName:\s*['"]([^'"]+)['"]\s*\}/g;
  while ((m = objRe.exec(src))) {
    couples.push({ mfr: m[2], pid: m[1], via: 'modelID' });
  }
  return couples;
}

function parseCache() {
  const cachePath = path.join(ROOT, 'data', 'z2m_herdsman_cache.json');
  if (!fs.existsSync(cachePath)) return [];
  const cache = JSON.parse(fs.readFileSync(cachePath));
  const couples = [];
  for (const d of cache.devices || []) {
    const models = d.models || (d.model ? [d.model] : []);
    const mfrs = d.mfrs || [];
    // Z2M cache often stores retail model not Zigbee pid — keep soft
    for (const mfr of mfrs) {
      for (const model of models) {
        couples.push({
          mfr,
          pid: model,
          via: 'cache',
          exposes: d.exposes || [],
          vendor: d.vendor,
          description: d.description,
        });
      }
    }
  }
  return couples;
}

function guessDriver(mfr, pid, snip = '') {
  const s = `${mfr} ${pid} ${snip}`.toLowerCase();
  if (/curtain|cover|motor|blind|shade/.test(s)) return 'curtain_motor';
  if (/presence|radar|mmwave|occupancy/.test(s)) return 'presence_sensor_radar';
  if (/thermostat|trv|radiator|valve_temp/.test(s)) return 'thermostat';
  if (/soil|moisture/.test(s)) return 'soil_sensor';
  if (/water.?leak|flood/.test(s)) return 'water_leak_sensor';
  if (/gas/.test(s)) return 'gas_sensor';
  if (/smoke/.test(s)) return 'smoke_sensor';
  if (/contact|door|window/.test(s)) return 'contact_sensor';
  if (/dimmer/.test(s)) return 'wall_dimmer_tuya';
  if (/plug|socket|outlet/.test(s)) return 'plug_energy_monitor';
  if (/knob|rotary/.test(s)) return 'smart_knob';
  if (/button|scene|remote/.test(s)) return 'button_wireless_4';
  if (/meter|din|energy/.test(s)) return 'din_rail_meter';
  if (/valve|irrigation/.test(s)) return 'water_valve_smart';
  if (/climate|temp|humidity|th_/.test(s)) return 'climate_sensor';
  if (/^TS0601$/i.test(pid)) return null; // ambiguous — need human/review
  return null;
}

function main() {
  const arg = process.argv.find((a) => a.startsWith('--tuya-src='));
  const tuyaSrc = arg ? arg.slice('--tuya-src='.length) : null;
  const ours = loadOurs();

  let couples = [];
  if (tuyaSrc && fs.existsSync(tuyaSrc)) {
    couples = parseTuyaTs(fs.readFileSync(tuyaSrc, 'utf8'));
  } else {
    // Prefer agent-tools dump if present
    const dump = path.join(
      process.env.USERPROFILE || '',
      '.cursor/projects/c-Users-Dell-Documents-homey-master/agent-tools/e6ee55a0-e612-466c-bd21-448433558292.txt',
    );
    if (fs.existsSync(dump)) couples = parseTuyaTs(fs.readFileSync(dump, 'utf8'));
    else couples = parseCache();
  }

  const uniq = new Map();
  for (const c of couples) {
    if (!c.mfr || !c.pid) continue;
    // Skip non-Zigbee-looking pids from cache retail names unless _TZ*
    const pid = String(c.pid);
    const mfr = String(c.mfr);
    if (!/^_T/i.test(mfr)) continue;
    const k = `${mfr.toLowerCase()}|${pid.toUpperCase()}`;
    if (!uniq.has(k)) uniq.set(k, { mfr, pid, via: c.via, exposes: c.exposes || [] });
  }

  const z2mOnly = [];
  const covered = [];
  for (const [k, c] of uniq) {
    if (ours.has(k)) {
      covered.push({ ...c, drivers: [...ours.get(k)] });
    } else {
      // Soft: pid must look like Zigbee model id (TS*, ZG-*, etc.)
      const looksPid = /^(TS|ZG-|SM|ZN)/i.test(c.pid);
      const guess = guessDriver(c.mfr, c.pid);
      z2mOnly.push({
        ...c,
        looksPid,
        guessDriver: guess,
        applySafe: !!(looksPid && guess),
      });
    }
  }

  const applySafe = z2mOnly.filter((x) => x.applySafe);
  const report = {
    generated: new Date().toISOString(),
    z2mCouples: uniq.size,
    covered: covered.length,
    z2mOnly: z2mOnly.length,
    applySafeCount: applySafe.length,
    applySafe: applySafe.slice(0, 200),
    review: z2mOnly.filter((x) => !x.applySafe).slice(0, 200),
  };

  fs.writeFileSync(path.join(OUT_DIR, 'DIFF.json'), JSON.stringify(report, null, 2));
  const md = [
    '# Z2M ↔ Homey sacred-couple diff (P2585)',
    '',
    `Generated: ${report.generated}`,
    '',
    `| Metric | Count |`,
    `|---|---:|`,
    `| Z2M couples parsed | ${report.z2mCouples} |`,
    `| Covered (cartesian hit) | ${report.covered} |`,
    `| Z2M-only | ${report.z2mOnly} |`,
    `| Apply-safe (mfr+_T* + TS*/ZG* + class guess) | ${report.applySafeCount} |`,
    '',
    '## Apply-safe (top)',
    '',
    ...applySafe.slice(0, 40).map((x) => `- \`${x.mfr}\`+\`${x.pid}\` → \`${x.guessDriver}\` (${x.via})`),
    '',
    'Doctrine: complementary union only (P2520). Never invent pid. Sacred couple lock.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'DIFF.md'), md);

  console.log(`[p2585] Z2M couples=${report.z2mCouples} covered=${report.covered} only=${report.z2mOnly} apply-safe=${report.applySafeCount}`);
  console.log(`[p2585] wrote ${path.relative(ROOT, OUT_DIR)}`);
  for (const x of applySafe.slice(0, 15)) {
    console.log(`  + ${x.mfr}+${x.pid} → ${x.guessDriver}`);
  }
}

main();
