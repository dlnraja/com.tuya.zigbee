'use strict';

// P3386: above the P3342 goal, the upload app.json keeps Latin-1 chars raw (wide mode) instead of
// 6-byte \u00XX escapes. Lossless (same JSON value), still one-byte in V8 (no char above U+00FF in
// the decoded text), fewer bytes and fewer chars. Data JSON files stay full ASCII.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { asciiPublishPayload } = require(path.join(ROOT, 'scripts', 'maintenance', 'ascii-json.cjs'));

const APP = {
  id: 'x',
  drivers: [{ id: 'd', name: { en: 'Temperature', fr: 'Température °C', de: 'Temperatur über' } }],
  flow: { triggers: [{ id: 't', title: { en: 'Power → on', fr: 'Allumé — prise 🔌' } }] },
};

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'p3386-')); }

test('app.json above wideAboveBytes is written in wide mode, lossless and one-byte', () => {
  const d = tmp();
  try {
    fs.writeFileSync(path.join(d, 'app.json'), JSON.stringify(APP));
    fs.mkdirSync(path.join(d, 'data'));
    fs.writeFileSync(path.join(d, 'data', 'x.json'), JSON.stringify({ t: 'déjà' }));
    const r = asciiPublishPayload(d, { wideAboveBytes: 10 });
    assert.strictEqual(r.appJsonMode, 'wide');
    const text = fs.readFileSync(path.join(d, 'app.json'), 'utf8');
    assert.deepStrictEqual(JSON.parse(text), APP, 'same value');
    assert.ok(!/[\u0100-\uffff]/.test(text), 'no char above U+00FF: V8 keeps a one-byte string');
    assert.ok(text.includes('Température'), 'Latin-1 kept raw');
    assert.ok(text.includes('\\u2192') && text.includes('\\ud83d'), 'chars above U+00FF stay escaped');
    assert.ok(r.appJsonBytes < r.appJsonAsciiBytes, 'smaller than full ASCII');
    const data = fs.readFileSync(path.join(d, 'data', 'x.json'), 'utf8');
    assert.ok(!/[\u0080-\uffff]/.test(data), 'data JSON files stay full ASCII');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('app.json at or under wideAboveBytes stays full ASCII (P3047 default unchanged)', () => {
  const d = tmp();
  try {
    fs.writeFileSync(path.join(d, 'app.json'), JSON.stringify(APP));
    const r = asciiPublishPayload(d, { wideAboveBytes: 10 * 1024 * 1024 });
    assert.strictEqual(r.appJsonMode, 'ascii');
    const text = fs.readFileSync(path.join(d, 'app.json'), 'utf8');
    assert.ok(!/[\u0080-\uffff]/.test(text));
    assert.deepStrictEqual(JSON.parse(text), APP);
    const r2 = asciiPublishPayload(d);
    assert.strictEqual(r2.appJsonMode, 'ascii', 'no threshold: ascii as before');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('prepare-publish passes the P3342 goal as the wide threshold, measured after the ASCII pass', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
  const step = src.indexOf('asciiPublishPayload(destDir, { wideAboveBytes })');
  assert.ok(step > 0, 'P3386 wide threshold not wired');
  assert.ok(src.indexOf("upload-manifest-ceiling.cjs').policy().goalBytes") > 0 && src.indexOf("upload-manifest-ceiling.cjs').policy().goalBytes") < step);
  assert.ok(src.indexOf('checkUploadManifest(destAppJson)') > step, 'ceiling measured after');
  const pol = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'upload-manifest-ceiling.json'), 'utf8'));
  assert.ok(pol.goalBytes < pol.ceilingBytes, 'goal stays below the ceiling');
});
