'use strict';
// P3068: perf harness tests see the shipped payload (no .homeyignore'd data/), so their heap numbers do
// not depend on source-only files + GC timing under parallel CI load (P3065 lifecycle flake).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PRELOAD = path.join(ROOT, 'test', '_support', 'shipped-payload-preload.js');

test('P3068 preload hides .homeyignore data/ entries and nothing else', () => {
  const probe = `const fs=require('fs');const p=require('path');const r=${JSON.stringify(ROOT)};
process.stdout.write(JSON.stringify([fs.existsSync(p.join(r,'data','mfs_db.json')),fs.existsSync(p.join(r,'app.json')),fs.existsSync(p.join(r,'package.json'))]));`;
  const out = JSON.parse(execFileSync(process.execPath, ['-r', PRELOAD, '-e', probe], { encoding: 'utf8' }));
  const ign = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
  if (/^data\/mfs_db\.json\s*$/m.test(ign)) {assert.strictEqual(out[0], false, 'mfs_db.json must be hidden');}
  assert.strictEqual(out[1], true);
  assert.strictEqual(out[2], true);
});

test('P3068 the lifecycle harness tests run with the shipped-payload preload', () => {
  for (const f of ['p3065-owned-timer-sweep.test.js', 'p3068-memory-budget-soak.test.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.match(src, /shipped-payload-preload/, f);
  }
});
