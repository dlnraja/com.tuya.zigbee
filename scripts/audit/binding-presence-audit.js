#!/usr/bin/env node
'use strict';
// P3207: lists manifest bindings that a sourced interview shows ABSENT on a couple of that driver.
// A bind request for a cluster the node lacks can fail pairing (GH#598). Read-only; --json for machine output.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EF00 = 61184;

function loadDrivers(root = ROOT) {
  const dir = path.join(root, 'drivers');
  const out = [];
  for (const id of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    const z = d.zigbee || {};
    const mfr = [].concat(z.manufacturerName || []).map(s => String(s).toLowerCase());
    const pid = [].concat(z.productId || []).map(s => String(s).toLowerCase());
    out.push({ id, mfr: new Set(mfr), pid: new Set(pid), endpoints: z.endpoints || {} });
  }
  return out;
}

function loadInterviews(root = ROOT) {
  const dir = path.join(root, 'docs', 'data', 'interviews');
  if (!fs.existsSync(dir)) {return [];}
  const out = [];
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort()) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (!j.manufacturerName || !j.productId || !j.endpoints) {continue;}
      out.push({ file: f, mfr: String(j.manufacturerName).toLowerCase(), pid: String(j.productId).toLowerCase(), endpoints: j.endpoints });
    } catch (_e) { /* skip malformed */ }
  }
  return out;
}

/** Pure: findings for one driver/interview pair. A binding is present if the ep lists it as input OR output cluster. */
function compare(driver, iv) {
  const findings = [];
  // WHY: normalized interviews with no cluster at all carry no evidence (harvest gap), never flag on them
  const known = Object.values(iv.endpoints).some(n => (n.inputClusters || []).length || (n.outputClusters || []).length);
  if (!known) {return findings;}
  for (const [ep, def] of Object.entries(driver.endpoints)) {
    const b = Array.isArray(def.bindings) ? def.bindings : [];
    const n = iv.endpoints[ep];
    for (const cid of b) {
      const present = !!n && [].concat(n.inputClusters || [], n.outputClusters || []).includes(cid);
      if (!present) {findings.push({ driver: driver.id, ep, cluster: cid, couple: `${iv.mfr}|${iv.pid}`, interview: iv.file, epMissing: !n });}
    }
  }
  return findings;
}

function audit(root = ROOT) {
  const drivers = loadDrivers(root);
  const ivs = loadInterviews(root);
  const findings = [];
  for (const iv of ivs) {
    for (const d of drivers) {
      if (d.mfr.has(iv.mfr) && d.pid.has(iv.pid)) {findings.push(...compare(d, iv));}
    }
  }
  const ef00 = drivers.filter(d => Object.values(d.endpoints).some(e => (e.bindings || []).includes(EF00))).map(d => d.id);
  // WHY(P3234): a continuation (<root>_2...) is the same logical driver as its root (DriverContinuations);
  // ratchets count logical drivers so a chain split never reads as a "new driver binding EF00".
  let chains = null;
  try { chains = require('../../lib/drivers/DriverContinuations').load(path.resolve(root)); } catch (_) { chains = null; }
  const logical = chains ? [...new Set(ef00.map(id => chains.rootOf(id)))] : ef00.slice();
  return { interviews: ivs.length, drivers: drivers.length, findings, ef00Bindings: ef00, ef00LogicalBindings: logical };
}

module.exports = { audit, compare, loadDrivers, loadInterviews };

if (require.main === module) {
  const r = audit();
  if (process.argv.includes('--json')) { process.stdout.write(`${JSON.stringify(r, null, 2)}\n`); } else {
    console.log(`[binding-audit] interviews=${r.interviews} drivers=${r.drivers} findings=${r.findings.length} ef00Bindings=${r.ef00Bindings.length}`);
    for (const f of r.findings) {console.log(`  ${f.driver} ep${f.ep} bind ${f.cluster} absent on ${f.couple} (${f.interview}${f.epMissing ? ', ep missing' : ''})`);}
  }
}
