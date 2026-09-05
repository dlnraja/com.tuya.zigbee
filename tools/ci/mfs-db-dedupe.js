#!/usr/bin/env node
'use strict';
/**
 * mfs-db-dedupe.js (P92.61)
 * data/mfs_db.json keys are matched CASE-INSENSITIVELY at runtime
 * (lib/utils/fingerprint-matcher.js normalizes every lookup). Two keys
 * that differ only by case are therefore the SAME device split across
 * two records — the richer one must absorb the leaner one.
 *
 * Merges case-duplicate keys: unions modelIds, concatenates sources,
 * prefers the Tuya-canonical form (prefix UPPER + suffix lower).
 *
 * Exit code 1 in --check mode when duplicates exist (CI gate).
 *
 * Usage: node tools/ci/mfs-db-dedupe.js [--apply|--check]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DB = path.join(ROOT, 'data', 'mfs_db.json');
const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');

function tuyaCanonical(k) {
  const m = String(k).match(/^(_t[zy][a-z0-9]+)_(.+)$/i);
  return m ? `${m[1].toUpperCase()}_${m[2].toLowerCase()}` : null;
}

const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
const groups = new Map(); // lower -> [keys]
for (const k of Object.keys(db)) {
  const lk = k.toLowerCase();
  if (!groups.has(lk)) {groups.set(lk, []);}
  groups.get(lk).push(k);
}

const dups = [...groups.entries()].filter(([, keys]) => keys.length > 1);
if (!dups.length) {
  console.log('[mfs-db-dedupe] OK — aucun doublon de casse (' + Object.keys(db).length + ' clés)');
  process.exit(0);
}

console.log(`[mfs-db-dedupe] ${dups.length} groupe(s) de doublons de casse:`);
for (const [lower, keys] of dups) {console.log(`  ${lower}: ${keys.join(' <-> ')}`);}

if (CHECK) {
  console.log('[mfs-db-dedupe] --check: échec (doublons présents)');
  process.exit(1);
}
if (!APPLY) {
  console.log('[mfs-db-dedupe] DRY-RUN — relancer avec --apply pour fusionner');
  process.exit(0);
}

for (const [lower, keys] of dups) {
  const entries = keys.map(k => db[k]);
  const merged = {};
  for (const e of entries) {
    for (const [f, v] of Object.entries(e || {})) {
      if (f === 'modelIds' && Array.isArray(v)) {
        merged.modelIds = [...new Set([...(merged.modelIds || []), ...v])];
      } else if (f === 'source') {
        merged.source = [...new Set([...(merged.source ? String(merged.source).split('+') : []), String(v)])].join('+');
      } else if (merged[f] === undefined) {
        merged[f] = v;
      }
    }
  }
  // clé conservée: forme canonique Tuya si dispo, sinon la plus courte
  const canonical = keys.find(k => tuyaCanonical(k) === k) ||
    keys.slice().sort((a, b) => a.length - b.length)[0];
  for (const k of keys) {if (k !== canonical) {delete db[k];}}
  db[canonical] = merged;
  console.log(`  [MERGED] -> ${canonical}`);
}

fs.writeFileSync(DB, JSON.stringify(db, null, 2) + '\n');
console.log(`[mfs-db-dedupe] APPLIED — ${Object.keys(db).length} clés restantes`);
