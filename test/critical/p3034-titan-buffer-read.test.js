'use strict';
// P3034: Syntax Check TITAN #6 forbids JSON.parse(fs.readFileSync(..., 'utf8')) in lib/ (string copy of large JSON
// on the Homey heap); CatalogStore (and FlowCardHelper on bastien-home) now parse the Buffer directly.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');

test('no JSON.parse(readFileSync utf8) left in lib (TITAN #6)', () => {
  let out = '';
  try {
    // exact Syntax Check TITAN #6 grep (.github/workflows/syntax-check.yml)
    out = execSync(`grep -r "JSON\\.parse(fs\\.readFileSync.*'utf8'" lib/ --include="*.js" -l`, { cwd: ROOT, encoding: 'utf8' });
  } catch (e) { out = e.stdout || ''; }
  assert.strictEqual(out.trim(), '', out);
});
test('CatalogStore still loads and parses its shards', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/memory/CatalogStore.js'), 'utf8');
  assert.match(src, /JSON\.parse\(fs\.readFileSync\(path\.join\(SHARD_DIR, 'index\.json'\)\)\)/);
  assert.doesNotThrow(() => require(path.join(ROOT, 'lib/memory/CatalogStore.js')));
});
