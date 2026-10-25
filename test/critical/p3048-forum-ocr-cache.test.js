'use strict';
// P3048 (t538u): free OCR — Tesseract eng+fra when installed, sha256 hash cache (no re-download, no re-OCR, no text kept).
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const path = require('path');
const O = require(path.join(__dirname, '..', '..', 'scripts', 'scanners', 'forum-image-ocr.js'));

test('ocrLangs: eng+fra when both packs are listed, eng otherwise', () => {
  assert.strictEqual(O.ocrLangs('List of available languages (3):\neng\nfra\nosd\n'), 'eng+fra');
  assert.strictEqual(O.ocrLangs('List of available languages (2):\neng\nosd\n'), 'eng');
  assert.strictEqual(O.ocrLangs(''), 'eng');
});
test('cacheLookup: URL hit, hash hit on new URL, miss', () => {
  const buf = Buffer.from('png-bytes');
  const h = crypto.createHash('sha256').update(buf).digest('hex');
  const cache = { byUrl: { 'https://u/1.png': h }, byHash: { [h]: { mfrs: ['_TZE200_abc'] } } };
  assert.deepStrictEqual(O.cacheLookup(cache, 'https://u/1.png').labels, { mfrs: ['_TZE200_abc'] });
  assert.strictEqual(O.cacheLookup(cache, 'https://u/2.png', buf).hash, h);
  assert.ok(O.cacheLookup(cache, 'https://u/2.png', buf).labels);
  assert.strictEqual(O.cacheLookup(cache, 'https://u/3.png'), null);
  assert.strictEqual(O.cacheLookup(cache, 'https://u/3.png', Buffer.from('other')).labels, null);
});
test('labelsOf: structured labels only (exact identifiers), no free text', () => {
  const l = O.labelsOf('Device _TZE200_abcdefgh model TS0601 dp 101');
  assert.ok(Array.isArray(l.mfrs) && Array.isArray(l.pids));
  assert.strictEqual(l.text, undefined);
});
