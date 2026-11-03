#!/usr/bin/env node
'use strict';
// P3262: driver-count ceiling gate. Every Athom-accepted master build has had exactly the
// last-accepted driver count (347); every build with more (348+) ended processing_failed
// AggregateError, even with a smaller manifest. Observed, unconfirmed by Athom (ticket 157057).
// Usage: node scripts/ci/driver-count-ceiling-gate.js <publishDir|app.json> [--branch=<b>]
// Warn on master, fail on stable-v5 / bastien-home (config/driver-count-ceiling.json).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BRANCH_MODE = { master: 'warn', 'stable-v5': 'fail', 'bastien-home': 'fail' };

function loadConfig(p) {
  return JSON.parse(fs.readFileSync(p || path.join(ROOT, 'config', 'driver-count-ceiling.json'), 'utf8'));
}

function countDrivers(app) {
  return new Set((app.drivers || []).map((d) => d && d.id).filter(Boolean)).size;
}

function evaluate(app, cfg, branch, apiCount) {
  const entry = (cfg.apps || {})[app.id];
  if (!entry) return { level: 'skip', msg: `no ceiling recorded for ${app.id}` };
  const b = branch || entry.branch;
  const mode = BRANCH_MODE[b] || entry.mode || 'warn';
  const count = countDrivers(app);
  // Athom's own count of the last Test build (public API) + our counting offset, else the static value.
  const max = Number.isInteger(apiCount) ? apiCount + (entry.apiOffset || 0) : entry.lastAccepted;
  if (count <= max) return { level: 'ok', count, max, mode, msg: `${count} drivers <= last accepted ${max} (${app.id})` };
  return {
    level: mode === 'fail' ? 'fail' : 'warn', count, max, mode,
    msg: `${count} drivers > last accepted ${max} for ${app.id}: Athom refused every such build so far (observed, unconfirmed by Athom, ticket ${cfg.athomTicket}). Put new couples into an existing driver or a continuation, or swap a placeholder one-for-one. See ${cfg.doc}.`,
  };
}

async function fetchApiCount(id, timeoutMs = 15000) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(`https://apps-api.athom.com/api/v1/app/${id}`, { signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j = await res.json();
    const d = j && j.testBuild && j.testBuild.drivers;
    return Array.isArray(d) ? d.length : null;
  } catch (_) { return null; }
}

async function main(argv) {
  const args = argv.slice(2);
  const branchArg = (args.find((a) => a.startsWith('--branch=')) || '').split('=')[1];
  const prepared = path.join(require('os').tmpdir(), 'homey-publish-temp');
  let target = args.find((a) => !a.startsWith('--')) || (fs.existsSync(prepared) ? prepared : path.join(ROOT, 'app.json'));
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'app.json');
  const app = JSON.parse(fs.readFileSync(target, 'utf8'));
  const cfg = loadConfig();
  let apiCount = null;
  if (args.includes('--athom-api')) {
    apiCount = await fetchApiCount(app.id);
    console.log(`[driver-count-ceiling] Athom public API testBuild drivers: ${apiCount === null ? 'unreachable, using lastAccepted' : apiCount}`);
  }
  const r = evaluate(app, cfg, branchArg || process.env.DRIVER_CEILING_BRANCH || '', apiCount);
  if (r.level === 'fail') { console.log(`::error title=driver-count ceiling (P3262)::${r.msg}`); return 1; }
  if (r.level === 'warn') console.log(`::warning title=driver-count ceiling (P3262)::${r.msg}`);
  else console.log(`[driver-count-ceiling] ${r.msg}`);
  return 0;
}

module.exports = { countDrivers, evaluate, loadConfig, fetchApiCount, BRANCH_MODE };
if (require.main === module) main(process.argv).then((c) => { process.exitCode = c; });
