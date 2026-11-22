'use strict';
// P3390 (22/11/2026 Paris, port of master 6ecc1339fe): node:test strict must preload
// the same setup as mocha (.mocharc require test/setup/host-env.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const S = require(path.join(ROOT, 'tools', 'ci', 'node-test-strict.js'));

test('strict runner preloads the mocha setup file', () => {
  const mocharc = JSON.parse(fs.readFileSync(path.join(ROOT, '.mocharc.json'), 'utf8'));
  const req = [].concat(mocharc.require || []).map((f) => path.resolve(ROOT, f));
  assert.ok(req.includes(S.SETUP_FILE), 'mocha and node:test share test/setup/host-env.js');
  assert.deepStrictEqual(S.setupArgs(), ['--require', S.SETUP_FILE]);
  assert.match(fs.readFileSync(S.SETUP_FILE, 'utf8'), /require\('\.\.\/\.\.\/lib\/utils\/LazyDeviceClass'\)/);
  const src = fs.readFileSync(path.join(ROOT, 'tools', 'ci', 'node-test-strict.js'), 'utf8');
  assert.match(src, /\.\.\.setupArgs\(\)/);
});
