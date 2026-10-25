#!/usr/bin/env node
'use strict';
/**
 * P3026: dependency-only npm cache key for actions/setup-node.
 *
 * WHY: setup-node keys its npm cache on hashFiles(package-lock.json). Every app version bump
 * rewrites the lockfile's own "version" fields, so each release created a new ~85 MB cache entry
 * (111 entries, 9.35 GB of the 10 GB repo cache on 25/10/2026) and pushed state caches towards
 * LRU eviction. .github/npm-cache-key.sha256 holds a hash of the lockfile WITHOUT the root package's
 * own name/version, so it only changes when a dependency changes. A stale key is harmless: npm ci
 * still installs exactly from package-lock.json, it just downloads what the cache lacks.
 *
 *   node scripts/ci/npm-cache-key.js --write   # refresh the key file
 *   node scripts/ci/npm-cache-key.js --check   # exit 1 when stale (report-only callers ignore it)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_FILE = path.join('.github', 'npm-cache-key.sha256');

function depsHash(lock) {
  const copy = JSON.parse(JSON.stringify(lock));
  delete copy.version; delete copy.name;
  if (copy.packages && copy.packages['']) { delete copy.packages[''].version; delete copy.packages[''].name; }
  return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex');
}

function compute(root) {
  return depsHash(JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')));
}

function check(root) {
  const want = compute(root);
  let have = '';
  try { have = (fs.readFileSync(path.join(root, KEY_FILE), 'utf8').match(/[0-9a-f]{64}/) || [''])[0]; } catch { /* missing */ }
  return { ok: have === want, have, want };
}

function write(root) {
  const want = compute(root);
  fs.writeFileSync(path.join(root, KEY_FILE), `# P3026 npm cache key: sha256 of package-lock.json without the app's own version. Regenerate: node scripts/ci/npm-cache-key.js --write\n${want}\n`);
  return want;
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..', '..');
  if (process.argv.includes('--write')) { console.log(`npm cache key written: ${write(root)}`); } else {
    const r = check(root);
    console.log(r.ok ? 'npm cache key up to date' : `npm cache key stale (have ${r.have.slice(0, 12) || 'none'}, want ${r.want.slice(0, 12)}): node scripts/ci/npm-cache-key.js --write`);
    process.exitCode = r.ok ? 0 : 1;
  }
}
module.exports = { depsHash, compute, check, write, KEY_FILE };
