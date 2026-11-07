'use strict';

/**
 * The 19s abort is still an unnamed JSON.parse. This locks the bounds we
 * can check without replacing JSON.parse: app.js does not load
 * product-reference.json, and a fingerprint load note is a label plus a
 * byte count.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const note = require('../../lib/utils/json-load-note');

test('app.js does not parse product-reference and does not replace JSON.parse', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');
  assert.strictEqual(src.includes('product-reference.json'), false);
  assert.strictEqual(src.includes('JSON.parse ='), false);
  assert.strictEqual(JSON.parse, JSON.parse);
  const parsed = JSON.parse('{"ok":1}');
  assert.strictEqual(parsed.ok, 1);
});

test('a fingerprint load note records bytes and not the manufacturer payload', () => {
  note._resetJsonLoadNotesForTests();
  const dbPath = path.join(__dirname, '../../lib/tuya/DeviceFingerprintDB.js');
  delete require.cache[dbPath];
  const db = require(dbPath);
  db.getFingerprint('_TZ3000_vsxvaj9i', 'TS0043');
  const dumped = JSON.stringify(note.recentJsonLoads());
  assert.strictEqual(dumped.includes('_TZ3000_vsxvaj9i'), false);
  assert.strictEqual(dumped.includes('product-reference'), false);
  const summary = note.jsonLoadSummary();
  assert.match(summary, /lazy-json-buffer:\d+/);
});
