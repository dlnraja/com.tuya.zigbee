#!/usr/bin/env node
'use strict';
/**
 * kg-query.js (v9.0.368) — Knowledge Graph query tool
 * Answers questions like:
 *   node tools/ci/kg-query.js mfr _TZE204_YJJDCQSQ      → pids associés
 *   node tools/ci/kg-query.js pid TS0207                → mfrs associés
 *   node tools/ci/kg-query.js unclaimed _TZ3000         → mfrs du KG absents des drivers
 *   node tools/ci/kg-query.js stats                     → compteurs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const KG_FILE = path.join(ROOT, '.github', 'state', 'knowledge-graph.json');

function loadKG() {
  return JSON.parse(fs.readFileSync(KG_FILE, 'utf8'));
}

function loadClaims() {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const claims = new Set();
  for (const d of app.drivers || []) {
    for (const m of d.zigbee?.manufacturerName || []) {claims.add(String(m).toLowerCase());}
  }
  return claims;
}

function relationsFor(kg, key, direction) {
  const out = new Set();
  for (const r of kg.relations || []) {
    if (direction === 'from' && r.from === key) {out.add(r.to);}
    if (direction === 'to' && r.to === key) {out.add(r.from);}
  }
  return [...out].sort();
}

function main() {
  const [cmd, arg] = process.argv.slice(2);
  const kg = loadKG();

  if (cmd === 'stats') {
    console.log('entities:', Object.keys(kg.entities || {}).length);
    console.log('relations:', (kg.relations || []).length);
    console.log('docs:', (kg.docs || []).length);
    return;
  }

  if (cmd === 'mfr' && arg) {
    const pids = relationsFor(kg, `mfr:${arg}`, 'from');
    console.log(`${arg} → ${pids.length} pid(s):`, pids.join(', ') || '(aucun)');
    return;
  }

  if (cmd === 'pid' && arg) {
    const mfrs = relationsFor(kg, `pid:${arg}`, 'to');
    console.log(`${arg} ← ${mfrs.length} mfr(s):`, mfrs.join(', ') || '(aucun)');
    return;
  }

  if (cmd === 'unclaimed') {
    const prefix = (arg || '').toLowerCase();
    const claims = loadClaims();
    const kgMfrs = new Set();
    for (const r of kg.relations || []) {
      if (r.from?.startsWith('mfr:')) {kgMfrs.add(r.from.slice(4));}
    }
    const missing = [...kgMfrs].filter(m => m.toLowerCase().startsWith(prefix) && !claims.has(m.toLowerCase())).sort();
    console.log(`${missing.length} mfr(s) du KG non couverts par les drivers:`);
    console.log(missing.slice(0, 50).join('\n'));
    if (missing.length > 50) {console.log(`… et ${missing.length - 50} de plus`);}
    return;
  }

  console.log('Usage: node tools/ci/kg-query.js [stats|mfr <mfr>|pid <pid>|unclaimed [prefix]]');
  process.exit(cmd ? 1 : 0);
}

main();
