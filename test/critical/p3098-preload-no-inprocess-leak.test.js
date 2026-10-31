'use strict';
// P3098 lesson: a test helper that patches a global (fs.existsSync) must not do it when mocha --recursive
// loads it in-process, or later tests see files as missing (order-dependent flakes). Dual runner.
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PRELOAD = path.join(ROOT, 'test', '_support', 'shipped-payload-preload.js');
const T = typeof describe === 'function' ? it : require('node:test');

T('P3098 requiring the preload in-process leaves fs.existsSync untouched', () => {
  const before = fs.existsSync;
  require(PRELOAD);
  assert.strictEqual(fs.existsSync, before);
  assert.strictEqual(fs.existsSync(path.join(ROOT, 'data', 'manufacturers.json')), true);
});

T('P3098 the preload still hides .homeyignore data/ under node -r', () => {
  const ign = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
  if (!/^data\/manufacturers\.json\s*$/m.test(ign)) {return;}
  const probe = `process.stdout.write(String(require('fs').existsSync(${JSON.stringify(path.join(ROOT, 'data', 'manufacturers.json'))})))`;
  assert.strictEqual(execFileSync(process.execPath, ['-r', PRELOAD, '-e', probe], { encoding: 'utf8' }), 'false');
});
