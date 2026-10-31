#!/usr/bin/env node
'use strict';
// P3092 (31/10/2026): today's lessons as one cheap static gate for CI.
//  1. P3089: a couple moved off a driver (p3077-phantom-decisions moves[].from) must not come back there
//     (case-insensitive) — catches a bump/enrich/kb bot that re-injects it.
//  2. P3090: a ZCL cluster read through the Z2M-style name only (seMetering / haElectricalMeasurement)
//     never matches zigbee-clusters; the same expression must also carry the `metering` /
//     `electricalMeasurement` alias. Ratchet: existing lines are baselined, new ones fail.
const fs = require('fs');
const path = require('path');

const ALIAS = { seMetering: 'metering', haElectricalMeasurement: 'electricalMeasurement' };
const low = (s) => String(s || '').trim().toLowerCase();

function walk(dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name.startsWith('.') || e.name === '_quarantine') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function checkMoves(root) {
  const errs = [];
  let d = null;
  try { d = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/p3077-phantom-decisions.json'), 'utf8')); } catch (_) { return errs; }
  for (const mv of d.moves || []) {
    const f = path.join(root, 'drivers', mv.from, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    let c; try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { continue; }
    const list = [].concat((c.zigbee && c.zigbee.manufacturerName) || []);
    if (list.some((m) => low(m) === low(mv.mfr))) errs.push(`P3089: ${mv.mfr} re-injected on ${mv.from} (kept on ${mv.keptOn})`);
  }
  return errs;
}

function zclLines(root) {
  const hits = [];
  for (const dir of ['lib', 'drivers']) {
    for (const f of walk(path.join(root, dir))) {
      const lines = fs.readFileSync(f, 'utf8').split('\n');
      lines.forEach((ln, i) => {
        for (const [bad, good] of Object.entries(ALIAS)) {
          if (new RegExp(`clusters\\??\\.${bad}\\b`).test(ln) && !new RegExp(`\\b${good}\\b`).test(ln.replace(new RegExp(bad, 'g'), ''))) {
            hits.push(`${path.relative(root, f)}::${ln.trim()}`);
          }
        }
      });
    }
  }
  return hits;
}

function run(root, opts = {}) {
  const basePath = path.join(root, 'tools/ci/workflow-lessons-zcl-baseline.json');
  const zcl = zclLines(root);
  if (opts.writeBaseline) { fs.writeFileSync(basePath, JSON.stringify([...new Set(zcl)].sort(), null, 1) + '\n'); }
  let base = [];
  try { base = JSON.parse(fs.readFileSync(basePath, 'utf8')); } catch (_) {}
  const known = new Set(base);
  const errs = checkMoves(root);
  for (const h of zcl) if (!known.has(h)) errs.push(`P3090: Z2M-only ZCL name without zigbee-clusters alias: ${h}`);
  return errs;
}

module.exports = { run, checkMoves, zclLines };
if (require.main === module) {
  const errs = run(process.cwd(), { writeBaseline: process.argv.includes('--write-baseline') });
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  console.log('workflow-lessons-gate: OK');
}
