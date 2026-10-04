#!/usr/bin/env node
'use strict';
/*
 * Spec 010 / T1: golden couple -> driver resolution snapshot.
 * For every driver compose (drivers/<id>/driver.compose.json) the zigbee manufacturerName and
 * productId lists are normalised (trim + lowercase, deduped, sorted) and hashed. The snapshot
 * stores per-driver counts + sha256 so any later refactor (sharding, lazy loading) can prove the
 * couple -> driver resolution is unchanged without committing megabytes of data.
 *
 * Usage: node scripts/perf/golden-couples.js --write [file]   (default specs/010-modular-lazy-data/golden-couples.json)
 *        node scripts/perf/golden-couples.js --check [file]   exit 1 if any driver lost couples
 * Additive growth (new couples, new drivers) is reported but allowed (R1 additive-only).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const mode = args.includes('--check') ? 'check' : (args.includes('--write') ? 'write' : 'print');
const fileArg = args.find((a) => !a.startsWith('--'));
const FILE = path.resolve(ROOT, fileArg || 'specs/010-modular-lazy-data/golden-couples.json');

const norm = (list) => [...new Set((Array.isArray(list) ? list : [list]).filter((v) => typeof v === 'string')
  .map((v) => v.trim().toLowerCase()).filter(Boolean))].sort();
const sha = (arr) => crypto.createHash('sha256').update(arr.join('\n')).digest('hex').slice(0, 16);

function snapshot() {
  const drivers = {};
  const dDir = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(dDir).sort()) {
    const f = path.join(dDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    const z = j.zigbee || {};
    const mfrs = norm(z.manufacturerName || []);
    const pids = norm(z.productId || []);
    if (!mfrs.length && !pids.length) continue;
    drivers[d] = { mfr: mfrs.length, pid: pids.length, mfrSha: sha(mfrs), pidSha: sha(pids), mfrs, pids };
  }
  return drivers;
}

const now = snapshot();
const slim = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) =>
  [k, { mfr: v.mfr, pid: v.pid, mfrSha: v.mfrSha, pidSha: v.pidSha }]));

if (mode === 'write') {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const body = { generated: new Date().toISOString(), drivers: Object.keys(now).length, snapshot: slim(now) };
  fs.writeFileSync(FILE, JSON.stringify(body, null, 1) + '\n');
  console.log(`[golden] wrote ${path.relative(ROOT, FILE)} (${body.drivers} drivers)`);
} else if (mode === 'check') {
  const old = JSON.parse(fs.readFileSync(FILE, 'utf8')).snapshot;
  const lost = []; const grown = []; const changed = [];
  for (const [d, o] of Object.entries(old)) {
    const n = now[d];
    if (!n) { lost.push(`${d}: driver missing`); continue; }
    if (n.mfr < o.mfr || n.pid < o.pid) lost.push(`${d}: mfr ${o.mfr}->${n.mfr} pid ${o.pid}->${n.pid}`);
    else if (n.mfr > o.mfr || n.pid > o.pid) grown.push(d);
    else if (n.mfrSha !== o.mfrSha || n.pidSha !== o.pidSha) changed.push(d);
  }
  const added = Object.keys(now).filter((d) => !old[d]);
  console.log(`[golden] grown=${grown.length} added=${added.length} sameCountChanged=${changed.length} lost=${lost.length}`);
  for (const l of lost) console.log(`  LOST ${l}`);
  for (const c of changed) console.log(`  CHANGED (same count) ${c}`);
  process.exit(lost.length || changed.length ? 1 : 0);
} else {
  console.log(JSON.stringify(slim(now), null, 1));
}
