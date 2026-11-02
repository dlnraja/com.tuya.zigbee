#!/usr/bin/env node
'use strict';
// WHY(P3238, 02/11/2026 Paris): stop driver sprawl. A NEW driver whose class + capability set is identical
// to an existing driver is rejected: add its exact couples to the existing driver (or its chain) instead.
// Exempt: registered continuations (config/architecture/driver-continuations.json via DriverContinuations)
// and drivers listed in config/publish-hold-drivers.json. Existing duplicates are baselined (never removed:
// Homey cannot migrate paired devices between drivers, ids stay). Usage: node <this> [--write-baseline]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BASELINE = path.join(ROOT, 'config', 'ci', 'driver-signature-baseline.json');

function readJson(f, dflt) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return dflt; } }

function exemptions(root) {
  const ex = new Set();
  try {
    const DC = require(path.join(root, 'lib', 'drivers', 'DriverContinuations'));
    if (DC.clearCache) {DC.clearCache();}
    const reg = DC.load(root);
    for (const id of Object.keys(reg.drivers || {})) {if (reg.isContinuation(id)) {ex.add(id);}}
  } catch (_) { /* no registry on this branch: no continuation exemption */ }
  const hold = readJson(path.join(root, 'config', 'publish-hold-drivers.json'), { drivers: [] });
  for (const d of hold.drivers || []) {if (d && d.id) {ex.add(d.id);}}
  return ex;
}

function signatures(root) {
  const dir = path.join(root, 'drivers');
  const sig = new Map();
  for (const id of fs.readdirSync(dir).sort()) {
    const c = readJson(path.join(dir, id, 'driver.compose.json'), null);
    if (!c) {continue;}
    const caps = [...new Set(c.capabilities || [])].sort();
    sig.set(id, `${c.class || ''}|${caps.join(',')}`);
  }
  return sig;
}

function duplicateGroups(root) {
  const ex = exemptions(root);
  const by = new Map();
  for (const [id, s] of signatures(root)) {
    if (ex.has(id)) {continue;}
    if (!by.has(s)) {by.set(s, []);}
    by.get(s).push(id);
  }
  return [...by.entries()].filter(([, ids]) => ids.length > 1).map(([s, ids]) => ({ signature: s, ids }));
}

function check(root = ROOT, baselineFile = BASELINE) {
  const base = new Set((readJson(baselineFile, { drivers: [] }).drivers) || []);
  const violations = [];
  for (const g of duplicateGroups(root)) {
    const fresh = g.ids.filter((id) => !base.has(id));
    if (fresh.length) {violations.push({ new: fresh, sameAs: g.ids.filter((id) => base.has(id)), signature: g.signature });}
  }
  return violations;
}

if (require.main === module) {
  if (process.argv.includes('--write-baseline')) {
    const ids = [...new Set(duplicateGroups(ROOT).flatMap((g) => g.ids))].sort();
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, `${JSON.stringify({ _why: 'P3238: drivers that already shared class+capabilities with another driver when the duplicate-signature gate landed. Never add an id here by hand: make the new driver a registered continuation or put its couples on the existing driver.', since: '2026-11-02', drivers: ids }, null, 2)}\n`);
    console.log(`baseline written: ${ids.length} drivers`);
    process.exit(0);
  }
  const v = check();
  if (v.length) {
    for (const x of v) {console.error(`FAIL new driver(s) ${x.new.join(', ')} duplicate class+capabilities of ${x.sameAs.join(', ') || '(another new driver)'} [${x.signature.slice(0, 160)}]`);}
    process.exit(1);
  }
  console.log('driver-signature-dup-gate OK (no new duplicate class+capabilities driver)');
}

module.exports = { check, duplicateGroups, signatures, exemptions };
