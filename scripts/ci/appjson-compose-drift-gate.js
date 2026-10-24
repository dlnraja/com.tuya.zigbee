#!/usr/bin/env node
/**
 * P3025 — app.json ↔ compose drift gate (check by default, --fix rewrites deterministically).
 *
 * WHY: the auto-publish bump (v9.0.1596) committed an app.json that had lost flow-card
 * titleFormatted present in .homeycompose, and stable/bastien carried 10 drivers whose
 * app.json fingerprints lagged driver.compose.json. Both are silent: Homey validate rebuilds
 * from compose, so only the tracked app.json drifts — until a tool trusts it.
 *
 * Checks (exact, no normalisation of case):
 *   fp   drivers/<id>/driver.compose.json zigbee.manufacturerName / productId == app.json (as sets)
 *   tf   .homeycompose/flow/<type>/<card>.json titleFormatted == app.json flow card titleFormatted,
 *        except cards whose compose titleFormatted homey-lib would reject (sanitize-manifest strips those).
 * --fix: copies compose values into app.json, touching nothing else; keeps compact/pretty style.
 *
 * Usage: node scripts/ci/appjson-compose-drift-gate.js [--fix] [--json] [--root=DIR]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FLOW_TYPES = ['triggers', 'conditions', 'actions'];

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

/** Same rule as homey-lib App._validateFlowCard/_checkTitleFormatted (implicit driver device arg excluded). */
function titleFormattedValid(card, titleFormatted) {
  const args = Array.isArray(card.args) ? card.args : [];
  const first = args.find(a => {
    if (!a || a.type !== 'device') {return false;}
    const f = new URLSearchParams(a.filter || '');
    return f.has('driver_id') || f.has('driverId');
  });
  const names = args.filter(a => a !== first).map(a => a && a.name);
  if (card.droptoken) {names.push('droptoken');}
  if (names.length === 0) {return false;} // nothing referable: a [[token]] cannot render
  const values = typeof titleFormatted === 'string' ? [titleFormatted] : Object.values(titleFormatted || {});
  for (const v of values) {
    const m = String(v).match(/\[\[(.*?)\]\]/gm);
    if (!m) {return false;}
    const seen = new Set();
    for (const tok of m) {
      const n = tok.slice(2, -2);
      if (!names.includes(n) || seen.has(n)) {return false;}
      seen.add(n);
    }
  }
  return true;
}

function sameSet(a, b) {
  const A = new Set(a || []); const B = new Set(b || []);
  if (A.size !== B.size) {return false;}
  for (const x of A) {if (!B.has(x)) {return false;}}
  return true;
}

function composeFlowCards(root) {
  const out = new Map();
  for (const t of FLOW_TYPES) {
    const dir = path.join(root, '.homeycompose', 'flow', t);
    if (!fs.existsSync(dir)) {continue;}
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
      try {
        const c = readJson(path.join(dir, f));
        out.set(`${t}:${c.id || f.replace(/\.json$/, '')}`, c);
      } catch (e) { out.set(`${t}:${f}`, { __error: e.message }); }
    }
  }
  return out;
}

function check(root, opts = {}) {
  const appPath = path.join(root, 'app.json');
  const raw = fs.readFileSync(appPath, 'utf8');
  const app = JSON.parse(raw);
  const drifts = [];
  for (const d of app.drivers || []) {
    const p = path.join(root, 'drivers', d.id, 'driver.compose.json');
    if (!fs.existsSync(p) || !d.zigbee) {continue;}
    let c;
    try { c = readJson(p); } catch (e) { drifts.push({ kind: 'fp', id: d.id, error: e.message }); continue; }
    if (!c.zigbee) {continue;}
    for (const key of ['manufacturerName', 'productId']) {
      if (c.zigbee[key] === undefined) {continue;}
      if (!sameSet(c.zigbee[key], d.zigbee[key])) {
        drifts.push({ kind: 'fp', id: d.id, key });
        if (opts.fix) {d.zigbee[key] = [...c.zigbee[key]];}
      }
    }
  }
  const compose = composeFlowCards(root);
  for (const t of FLOW_TYPES) {
    for (const card of (app.flow && app.flow[t]) || []) {
      const c = compose.get(`${t}:${card.id}`);
      if (!c || c.__error || c.titleFormatted === undefined) {continue;}
      // Exempt exactly what sanitize-manifest strips: a [[device]] token homey-lib would reject.
      if (JSON.stringify(c.titleFormatted).includes('[[device]]') && !titleFormattedValid(card, c.titleFormatted)) {continue;}
      if (JSON.stringify(card.titleFormatted) !== JSON.stringify(c.titleFormatted)) {
        drifts.push({ kind: 'tf', id: `${t}:${card.id}`, missing: card.titleFormatted === undefined });
        if (opts.fix) {card.titleFormatted = JSON.parse(JSON.stringify(c.titleFormatted));}
      }
    }
  }
  if (opts.fix && drifts.length) {
    const compact = !/\n\s/.test(raw.trimEnd());
    fs.writeFileSync(appPath, (compact ? JSON.stringify(app) : JSON.stringify(app, null, 2)) + '\n');
  }
  return drifts;
}

module.exports = { check, titleFormattedValid, sameSet };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const rootArg = argv.find(a => a.startsWith('--root='));
  const root = path.resolve(rootArg ? rootArg.slice(7) : path.join(__dirname, '..', '..'));
  const fix = argv.includes('--fix');
  const drifts = check(root, { fix });
  if (argv.includes('--json')) {console.log(JSON.stringify(drifts, null, 2));}
  if (!drifts.length) { console.log('✅ app.json ↔ compose: no drift (fingerprints + flow titleFormatted)'); process.exit(0); }
  for (const x of drifts.slice(0, 40)) {console.error(`${fix ? '🔧' : '❌'} ${x.kind} ${x.id} ${x.key || ''}${x.missing ? ' (titleFormatted missing)' : ''}${x.error ? ' ' + x.error : ''}`);}
  if (fix) { console.log(`🔧 fixed ${drifts.length} drift(s) in app.json from compose`); process.exit(0); }
  console.error(`${drifts.length} drift(s). Fix: node scripts/ci/appjson-compose-drift-gate.js --fix && git add app.json`);
  process.exit(1);
}
