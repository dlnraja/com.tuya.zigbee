'use strict';
/**
 * P3020: lib/data/fingerprint_map.json was a stale, unreferenced snapshot (last touched 2026-09-05,
 * contained NUL-padded junk modelIds like "\u0000B"). No runtime, script, test or CI file read it,
 * yet it shipped in the app bundle. Removed. lib/data/new_fingerprints.json is KEPT: critical
 * routing locks (soil-myd45weu, presence-mtg-relay, p2138) and tools/ci/apply-p2236 read it.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) {continue;}
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {walk(p, out);} else if (/\.(js|cjs|mjs)$/.test(e.name)) {out.push(p);}
  }
  return out;
}

describe('P3020 stale lib/data fingerprint snapshots', () => {
  it('fingerprint_map.json is gone and nothing in code requires it', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'lib/data/fingerprint_map.json')));
    const offenders = [];
    for (const d of ['lib', 'drivers', 'scripts', 'tools']) {
      const abs = path.join(ROOT, d);
      if (!fs.existsSync(abs)) {continue;}
      for (const f of walk(abs, [])) {
        if (/fingerprint_map\.json/.test(fs.readFileSync(f, 'utf8'))) {offenders.push(path.relative(ROOT, f));}
      }
    }
    assert.deepStrictEqual(offenders, []);
  });
  it('new_fingerprints.json stays (read by routing locks) and parses', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/data/new_fingerprints.json'), 'utf8'));
    assert.ok(j && typeof j === 'object' && Object.keys(j).length > 100);
  });
});
