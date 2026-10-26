#!/usr/bin/env node
'use strict';
// P3065: flow-card consistency audit from compose sources (no `homey app build` needed).
// Checks: duplicate ids per kind, cards without en title, args without name/type or duplicated,
// titleFormatted [[x]] that is not an arg, and literal get{Action,Condition,Trigger,DeviceTrigger}Card('id')
// references in code whose id is not declared in that kind.
// Usage: node scripts/diag/flow-card-audit.js [--json]
const fs = require('fs');
const path = require('path');

const KINDS = ['triggers', 'conditions', 'actions'];
const CALL_KIND = { Action: 'actions', Condition: 'conditions', Trigger: 'triggers', DeviceTrigger: 'triggers' };

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { return null; } }

function collectCards(root) {
  const cards = { triggers: [], conditions: [], actions: [] };
  for (const k of KINDS) {
    const d = path.join(root, '.homeycompose', 'flow', k);
    if (!fs.existsSync(d)) {continue;}
    for (const f of fs.readdirSync(d).sort()) {
      if (!f.endsWith('.json')) {continue;}
      const j = readJson(path.join(d, f));
      if (j) {cards[k].push({ card: Object.assign({ id: f.replace(/\.json$/, '') }, j), src: `.homeycompose/flow/${k}/${f}` });}
    }
  }
  const dDir = path.join(root, 'drivers');
  for (const dr of fs.readdirSync(dDir).sort()) {
    for (const fn of ['driver.flow.compose.json', 'driver.compose.json']) {
      const p = path.join(dDir, dr, fn);
      if (!fs.existsSync(p)) {continue;}
      const j = readJson(p);
      const fl = j && (fn === 'driver.compose.json' ? j.flow : j);
      if (!fl) {continue;}
      for (const k of KINDS) {for (const c of fl[k] || []) {cards[k].push({ card: c, src: `drivers/${dr}/${fn}` });}}
    }
  }
  return cards;
}

function codeFiles(root) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) {continue;}
      const p = path.join(d, e.name);
      if (e.isDirectory()) {walk(p);} else if (e.name.endsWith('.js')) {out.push(p);}
    }
  };
  for (const p of ['lib', 'drivers']) {if (fs.existsSync(path.join(root, p))) {walk(path.join(root, p));}}
  if (fs.existsSync(path.join(root, 'app.js'))) {out.push(path.join(root, 'app.js'));}
  return out;
}

function audit(root) {
  const cards = collectCards(root);
  const ids = {};
  const r = { counts: {}, duplicateIds: [], noEnTitle: [], badArgs: [], titleFormattedUnknown: [], undeclaredRefs: [] };
  for (const k of KINDS) {
    ids[k] = new Set();
    r.counts[k] = cards[k].length;
    for (const { card, src } of cards[k]) {
      const id = card.id;
      if (ids[k].has(id)) {r.duplicateIds.push(`${k}:${id} (${src})`);}
      ids[k].add(id);
      if (!card.title || !card.title.en) {r.noEnTitle.push(`${k}:${id}`);}
      const names = new Set();
      for (const a of card.args || []) {
        if (!a || !a.name || !a.type) {r.badArgs.push(`${k}:${id} arg missing name/type`); continue;}
        if (names.has(a.name)) {r.badArgs.push(`${k}:${id} duplicate arg ${a.name}`);}
        names.add(a.name);
      }
      const tf = card.titleFormatted && card.titleFormatted.en;
      if (typeof tf === 'string') {
        for (const m of tf.matchAll(/\[\[([^\]]+)\]\]/g)) {if (!names.has(m[1])) {r.titleFormattedUnknown.push(`${k}:${id} [[${m[1]}]]`);}}
      }
    }
  }
  const re = /get(Action|Condition|Trigger|DeviceTrigger)Card\(\s*['"`]([^'"`$]+)['"`]\s*\)/g;
  const seen = new Set();
  for (const f of codeFiles(root)) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(re)) {
      const k = CALL_KIND[m[1]];
      const key = `${k}:${m[2]}`;
      if (!ids[k].has(m[2]) && !seen.has(key)) {seen.add(key); r.undeclaredRefs.push(key);}
    }
  }
  for (const key of Object.keys(r)) {if (Array.isArray(r[key])) {r[key].sort();}}
  return r;
}

module.exports = { audit, collectCards };

if (require.main === module) {
  const r = audit(path.resolve(__dirname, '..', '..'));
  if (process.argv.includes('--json')) {console.log(JSON.stringify(r, null, 2));} else {
    console.log(`[flow-audit] cards ${JSON.stringify(r.counts)}`);
    for (const key of ['duplicateIds', 'noEnTitle', 'badArgs', 'titleFormattedUnknown', 'undeclaredRefs']) {
      console.log(`[flow-audit] ${key}: ${r[key].length}`);
      for (const x of r[key].slice(0, 40)) {console.log(`   - ${x}`);}
    }
  }
}
