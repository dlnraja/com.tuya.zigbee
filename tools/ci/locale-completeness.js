#!/usr/bin/env node
'use strict';
/**
 * locale-completeness.js (v9.0.368)
 * Verifies every locale has the same leaf keys as en.json (nested),
 * and that no file contains UTF-8 double-encoding mojibake (Ã©, Â°, …).
 *
 * Usage:
 *   node tools/ci/locale-completeness.js          # audit (exit 1 on gaps)
 *   node tools/ci/locale-completeness.js --fix    # fill missing leaves from en.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LOCALES = path.join(ROOT, 'locales');
const MOJIBAKE = /Ã[€©¨ª«¬®¯°²³´µ¶·¸¹º»¼½¾¿]|Â[°±²³´µ¶·]/;

function leaves(o, p = '') {
  let r = [];
  for (const [k, v] of Object.entries(o)) {
    const q = p ? p + '.' + k : k;
    if (v && typeof v === 'object') {r = r.concat(leaves(v, q));}
    else {r.push(q);}
  }
  return r;
}

function fill(target, src) {
  let n = 0;
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object') {
      if (!target[k] || typeof target[k] !== 'object') {target[k] = {};}
      n += fill(target[k], v);
    } else if (!(k in target)) {target[k] = v; n++;}
  }
  return n;
}

function audit({ fix = false } = {}) {
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES, 'en.json'), 'utf8'));
  const enLeaves = leaves(en);
  const problems = [];

  for (const file of fs.readdirSync(LOCALES).filter(f => f.endsWith('.json'))) {
    const p = path.join(LOCALES, file);
    const raw = fs.readFileSync(p, 'utf8');
    if (MOJIBAKE.test(raw)) {problems.push({ locale: file, type: 'mojibake' });}
    const data = JSON.parse(raw);
    const set = new Set(leaves(data));
    const missing = enLeaves.filter(k => !set.has(k));
    if (missing.length) {
      problems.push({ locale: file, type: 'missing', count: missing.length, keys: missing });
      if (fix) {
        fill(data, en);
        fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
      }
    }
  }
  return problems;
}

if (require.main === module) {
  const fix = process.argv.includes('--fix');
  const problems = audit({ fix });
  if (!problems.length) {
    console.log('✓ locales complètes, aucun mojibake');
  } else {
    for (const p of problems) {
      console.log(p.type === 'mojibake'
        ? `⚠ ${p.locale}: mojibake détecté`
        : `⚠ ${p.locale}: ${p.count} clés manquantes${fix ? ' (comblées depuis en.json)' : ''}`);
    }
    if (!fix) {process.exit(1);}
  }
}

module.exports = { audit, leaves, MOJIBAKE };
