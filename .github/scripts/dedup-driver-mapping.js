#!/usr/bin/env node
/**
 * dedup-driver-mapping.js
 * Removes duplicate keys (case-insensitive) from driver-mapping-database.json.
 * Preserves the LAST occurrence (most recent addition wins).
 * 
 * Usage:
 *   node .github/scripts/dedup-driver-mapping.js         # dry-run
 *   node .github/scripts/dedup-driver-mapping.js --fix   # write in-place
 *   node .github/scripts/dedup-driver-mapping.js --ci    # exit 1 if dupes found
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..', '..');
const DB_PATH  = path.join(ROOT, 'driver-mapping-database.json');
const FIX_MODE = process.argv.includes('--fix');
const CI_MODE  = process.argv.includes('--ci');

const raw = fs.readFileSync(DB_PATH, 'utf8');

// Parse raw JSON keeping duplicate keys by walking the string
// We can't use JSON.parse() as it silently drops dupes
// Instead: parse normally then re-scan the raw string for duplicate keys
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (e) {
  console.error('FATAL: driver-mapping-database.json is not valid JSON:', e.message);
  process.exit(1);
}

// Count actual keys in raw text (regex-based, fast)
const KEY_RE = /^[ \t]*"([^"\\]+)"\s*:/gm;
const rawKeys = [];
let m;
while ((m = KEY_RE.exec(raw)) !== null) {
  rawKeys.push(m[1]);
}

const totalRaw = rawKeys.length;
const seenLower = new Map(); // lower -> first-seen original
const dupeKeys = [];

for (const k of rawKeys) {
  const kl = k.toLowerCase();
  if (seenLower.has(kl)) {
    dupeKeys.push({ dup: k, orig: seenLower.get(kl) });
  } else {
    seenLower.set(kl, k);
  }
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  DRIVER MAPPING DEDUPLICATION');
console.log(`║  ${DB_PATH}`);
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log(`Total keys in raw JSON : ${totalRaw}`);
console.log(`Unique keys (case-ins.) : ${seenLower.size}`);
console.log(`Duplicates found        : ${dupeKeys.length}`);

if (dupeKeys.length > 0) {
  console.log('\nSample duplicates (first 20):');
  dupeKeys.slice(0, 20).forEach(({ dup, orig }) =>
    console.log(`  "${dup}" duplicates "${orig}"`)
  );
}

if (CI_MODE && dupeKeys.length > 0) {
  console.error(`\n❌ CI FAIL: ${dupeKeys.length} duplicate keys in driver-mapping-database.json`);
  console.error('   Run: node .github/scripts/dedup-driver-mapping.js --fix');
  process.exit(1);
}

if (!FIX_MODE) {
  if (dupeKeys.length === 0) {
    console.log('\n✅ No duplicates found — file is clean.');
  } else {
    console.log('\n⚠️  DRY RUN — pass --fix to write the deduplicated file.');
  }
  process.exit(0);
}

// Build clean object: iterate parsed keys (already deduped by JSON.parse — last value wins)
// JSON.parse keeps the last occurrence of duplicate keys, which is our desired behavior
const cleanObj = {};
for (const [k, v] of Object.entries(parsed)) {
  cleanObj[k] = v;
}

const before = Buffer.byteLength(raw, 'utf8');
const cleanStr = JSON.stringify(cleanObj, null, 2);
const after = Buffer.byteLength(cleanStr, 'utf8');

// Backup original
const backupPath = DB_PATH + '.dedup-backup';
fs.writeFileSync(backupPath, raw);

// Write clean file
fs.writeFileSync(DB_PATH, cleanStr);

console.log('\n✅ FIX APPLIED:');
console.log(`  Before : ${(before / 1024).toFixed(1)} KB, ${totalRaw} raw keys`);
console.log(`  After  : ${(after / 1024).toFixed(1)} KB, ${Object.keys(cleanObj).length} unique keys`);
console.log(`  Saved  : ${((before - after) / 1024).toFixed(1)} KB`);
console.log(`  Backup : ${backupPath}`);
