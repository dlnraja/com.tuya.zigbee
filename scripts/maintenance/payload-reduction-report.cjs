#!/usr/bin/env node
'use strict';
// WHY(P3041, 25/10/2026 Paris): one reproducible measure of what makes the publish payload big and what
// each reduction lever would buy, so caps and splits are decided on numbers, not assumptions.
//   node scripts/maintenance/payload-reduction-report.cjs <payload app.json> [--json]
// Reports: uploaded bytes by section, combos (total, per driver, drivers above the 1008 Athom accepted),
// case-folded couples, unsourced case twins (scripts/lib/case-form-sources.cjs), P3036 parasites
// (scripts/ci/mfr-multi-driver-audit.js) and a TS0601-only carrier simulation (rows that only a TS0601
// couple justifies still pay |productId| combos in a mixed driver; in a TS0601-only sibling they pay 1).
const fs = require('fs');
const path = require('path');
const { loadSourcedForms, splitArtifactForms } = require('../lib/case-form-sources.cjs');

const ROOT = path.join(__dirname, '..', '..');
const ACCEPTED_DRIVER = 1008;
const bytes = (v) => Buffer.byteLength(JSON.stringify(v === undefined ? null : v), 'utf8');
const lc = (s) => String(s).trim().toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : []);
const readJson = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return fb; } };

/** Known real pids per case-folded mfr (z2m cache, couple-guard, KB couples). Empty map = unknown. */
function knownPids(root) {
  const m = new Map();
  const add = (mfr, pid) => { const k = lc(mfr); if (!m.has(k)) m.set(k, new Set()); m.get(k).add(lc(pid)); };
  for (const d of readJson(path.join(root, 'data', 'z2m_herdsman_cache.json'), { devices: [] }).devices || []) {
    for (const mf of d.mfrs || []) for (const p of [...arr(d.modelIds), ...arr(d.zigbeeModels)]) add(mf, p);
  }
  const guard = readJson(path.join(root, 'lib', 'data', 'couple-guard.json'), { drivers: {} });
  for (const e of Object.values(guard.drivers || {})) for (const [mf, pids] of Object.entries(e.mfrs || {})) for (const p of pids) add(mf, p);
  for (const k of Object.keys(readJson(path.join(root, 'data', 'kb', 'couples.json'), { couples: {} }).couples || {})) {
    const [mf, p] = k.split('|'); if (mf && p) add(mf, p);
  }
  return m;
}

function carrierSimulation(manifest, known, carrierPid = 'ts0601') {
  const perDriver = [];
  let saved = 0;
  for (const d of manifest.drivers || []) {
    const z = d && d.zigbee;
    if (!z) continue;
    const P = arr(z.productId).map(lc);
    if (P.length < 2 || !P.includes(carrierPid)) continue;
    const keys = [...new Set(arr(z.manufacturerName).map(lc))];
    let rows = 0;
    for (const k of keys) {
      const kp = known.get(k);
      const wanted = kp ? P.filter((p) => kp.has(p)) : [];
      if ((wanted.length && wanted.every((p) => p === carrierPid)) || (!wanted.length && k.startsWith('_tze'))) {
        rows += arr(z.manufacturerName).filter((v) => lc(v) === k).length;
      }
    }
    if (!rows) continue;
    const s = rows * (P.length - 1);
    saved += s;
    perDriver.push({ id: d.id, rows, productIds: P.length, saved: s });
  }
  perDriver.sort((a, b) => b.saved - a.saved);
  return { saved, drivers: perDriver.length, perDriver };
}

function report(manifest, opts = {}) {
  const root = opts.root || ROOT;
  const sourced = opts.sourced || loadSourcedForms(root);
  const sec = {};
  for (const k of Object.keys(manifest)) sec[k] = bytes(manifest[k]);
  const drv = { settings: 0, zigbee: 0, manufacturerName: 0, productId: 0, learnmode: 0, capabilitiesOptions: 0 };
  let total = 0; let artifactForms = 0; let artifactCombos = 0;
  const perDriver = [];
  const folded = new Set();
  for (const d of manifest.drivers || []) {
    drv.settings += bytes(d.settings || []);
    drv.capabilitiesOptions += bytes(d.capabilitiesOptions || {});
    const z = d.zigbee;
    if (!z) continue;
    drv.zigbee += bytes(z); drv.manufacturerName += bytes(z.manufacturerName || []);
    drv.productId += bytes(z.productId || []); drv.learnmode += bytes(z.learnmode || null);
    const M = arr(z.manufacturerName); const P = arr(z.productId);
    const c = M.length * P.length;
    total += c;
    perDriver.push({ id: d.id, combos: c });
    for (const m of M) for (const p of P) folded.add(`${lc(m)}|${lc(p)}`);
    const a = splitArtifactForms(M, sourced).artifacts.length;
    artifactForms += a; artifactCombos += a * P.length;
  }
  perDriver.sort((a, b) => b.combos - a.combos);
  let flowCards = 0;
  const unique = new Set();
  for (const t of Object.keys(manifest.flow || {})) {
    for (const card of arr(manifest.flow[t])) {
      flowCards += 1;
      const c = { ...card }; delete c.id;
      unique.add(JSON.stringify(c).replace(/driver_id=[^"&]*/g, 'driver_id=*'));
    }
  }
  let parasitic = null;
  if (opts.parasites !== false) {
    try { parasitic = require('../ci/mfr-multi-driver-audit.js').audit(manifest, root).parasitic.length; } catch (_) { parasitic = null; }
  }
  return {
    bytes: Buffer.byteLength(JSON.stringify(manifest), 'utf8'),
    sections: sec,
    drivers: drv,
    flow: { cards: flowCards, uniqueIgnoringDriver: unique.size },
    combos: { total, maxDriver: perDriver.length ? perDriver[0].combos : 0, aboveAccepted: perDriver.filter((x) => x.combos > ACCEPTED_DRIVER).length, top: perDriver.slice(0, 10) },
    couplesCaseFolded: folded.size,
    artifactCaseForms: { forms: artifactForms, combos: artifactCombos },
    parasitic,
    carrier: carrierSimulation(manifest, opts.known || knownPids(root)),
  };
}

module.exports = { report, carrierSimulation, knownPids };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: payload-reduction-report.cjs <payload app.json> [--json]'); process.exit(2); }
  const r = report(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (process.argv.includes('--json')) { process.stdout.write(`${JSON.stringify(r, null, 2)}\n`); process.exit(0); }
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`app.json ${r.bytes} B | flow ${kb(r.sections.flow || 0)} (${r.flow.cards} cards, ${r.flow.uniqueIgnoringDriver} unique without driver filter) | drivers ${kb(r.sections.drivers || 0)} (settings ${kb(r.drivers.settings)}, zigbee ${kb(r.drivers.zigbee)}: mfr ${kb(r.drivers.manufacturerName)}, pid ${kb(r.drivers.productId)}, learnmode ${kb(r.drivers.learnmode)})`);
  console.log(`combos ${r.combos.total}, max/driver ${r.combos.maxDriver}, drivers > ${ACCEPTED_DRIVER}: ${r.combos.aboveAccepted}; case-folded couples ${r.couplesCaseFolded}; parasites ${r.parasitic}`);
  console.log(`unsourced case twins: ${r.artifactCaseForms.forms} forms = ${r.artifactCaseForms.combos} combos`);
  console.log(`TS0601-only carrier siblings: -${r.carrier.saved} combos over ${r.carrier.drivers} drivers; top ${r.carrier.perDriver.slice(0, 6).map((x) => `${x.id} -${x.saved}`).join(', ')}`);
}
