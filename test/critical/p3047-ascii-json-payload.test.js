'use strict';

// P3047: payload JSON written as ASCII (\uXXXX) at the end of prepare-publish.
// Lossless round trip, one-byte V8 strings (half the parse heap), 4 MB fallback.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const v8 = require('v8');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const {
  stringifyAscii, asciiJsonFile, asciiJsonTree, asciiPublishPayload,
} = require(path.join(ROOT, 'scripts', 'maintenance', 'ascii-json.cjs'));

const SAMPLE = {
  'clé ☃': 'Température → 21 °C',
  emoji: 'bouton 🔘 appuyé',
  lone: 'x\ud800y',
  ru: 'Включить',
  latin: 'Ça va déjà',
  ctrl: 'a\u0000b\nc\u007f',
  nested: [{ n: 1.5, t: true, z: null, s: '中文' }],
};

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'p3047-'));
}

test('stringifyAscii is pure ASCII and parses back to the same value', () => {
  const out = stringifyAscii(SAMPLE);
  assert.ok(!/[\u0080-\uffff]/.test(out), 'output must be ASCII');
  assert.deepStrictEqual(JSON.parse(out), SAMPLE);
  assert.ok(out.includes('\\u00e9'), 'Latin-1 escaped too in ascii mode');
});

test('wide mode keeps Latin-1 but escapes every char above U+00FF', () => {
  const out = stringifyAscii(SAMPLE, 'wide');
  assert.ok(!/[\u0100-\uffff]/.test(out));
  assert.ok(out.includes('é'));
  assert.deepStrictEqual(JSON.parse(out), SAMPLE);
});

test('asciiJsonTree rewrites non-ASCII JSON, skips node_modules, leaves the rest alone', () => {
  const d = tmpDir();
  try {
    fs.mkdirSync(path.join(d, 'data'));
    fs.mkdirSync(path.join(d, 'node_modules', 'x'), { recursive: true });
    fs.writeFileSync(path.join(d, 'data', 'a.json'), `\uFEFF${JSON.stringify(SAMPLE, null, 2)}`);
    fs.writeFileSync(path.join(d, 'plain.json'), '{ "a": 1 }');
    fs.writeFileSync(path.join(d, 'broken.json'), '{ "é": ');
    fs.writeFileSync(path.join(d, 'node_modules', 'x', 'p.json'), '{"é":1}');
    const changed = asciiJsonTree(d);
    assert.deepStrictEqual(changed.map((c) => path.relative(d, c.file)), [path.join('data', 'a.json')]);
    const text = fs.readFileSync(path.join(d, 'data', 'a.json'), 'utf8');
    assert.ok(!/[\u0080-\uffff]/.test(text));
    assert.deepStrictEqual(JSON.parse(text), SAMPLE);
    assert.strictEqual(fs.readFileSync(path.join(d, 'plain.json'), 'utf8'), '{ "a": 1 }');
    assert.strictEqual(fs.readFileSync(path.join(d, 'broken.json'), 'utf8'), '{ "é": ');
    assert.strictEqual(fs.readFileSync(path.join(d, 'node_modules', 'x', 'p.json'), 'utf8'), '{"é":1}');
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('app.json falls back to wide mode when full ASCII would pass the size limit', () => {
  const d = tmpDir();
  try {
    const app = { id: 'x', name: { fr: `${'é'.repeat(200)  } → ok` } };
    fs.writeFileSync(path.join(d, 'app.json'), JSON.stringify(app));
    const utf8Size = fs.statSync(path.join(d, 'app.json')).size;
    const r = asciiPublishPayload(d, { maxAppJsonBytes: utf8Size + 10 });
    assert.strictEqual(r.appJsonMode, 'wide');
    const text = fs.readFileSync(path.join(d, 'app.json'), 'utf8');
    assert.ok(!/[\u0100-\uffff]/.test(text));
    assert.ok(r.appJsonBytes <= utf8Size + 10);
    assert.deepStrictEqual(JSON.parse(text), app);
    const full = asciiPublishPayload(d);
    assert.strictEqual(full.appJsonMode, 'ascii');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(d, 'app.json'), 'utf8')), app);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('one char above U+00FF doubles the text heap; the ASCII file loads one-byte', () => {
  v8.setFlagsFromString('--expose-gc');
  const gc = vm.runInNewContext('gc');
  const d = tmpDir();
  try {
    const big = { rows: Array.from({ length: 40000 }, (_, i) => ({ id: `_TZE200_${i}`, note: 'température' })), arrow: '→' };
    const f = path.join(d, 'big.json');
    fs.writeFileSync(f, JSON.stringify(big));
    const heapOfText = () => {
      gc(); gc();
      const h0 = process.memoryUsage().heapUsed;
      let s = fs.readFileSync(f, 'utf8');
      gc();
      const h1 = process.memoryUsage().heapUsed;
      const len = s.length;
      s = null;
      return { bytes: h1 - h0, len };
    };
    const before = heapOfText();
    const r = asciiJsonFile(f);
    assert.ok(r && r.wide === 1);
    const after = heapOfText();
    assert.ok(before.bytes > before.len * 1.8, `two-byte before: ${before.bytes} for ${before.len} chars`);
    assert.ok(after.bytes < after.len * 1.2, `one-byte after: ${after.bytes} for ${after.len} chars`);
    assert.ok(after.bytes < before.bytes * 0.6, `heap ${before.bytes} -> ${after.bytes}`);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')), big);
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('prepare-publish runs the ASCII step after the last app.json write and before the pruned validate', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
  const step = src.indexOf('asciiPublishPayload(destDir)');
  assert.ok(step > 0, 'P3047 step missing');
  const lastWrite = src.lastIndexOf('fs.writeFileSync(destAppJson');
  assert.ok(lastWrite > 0 && lastWrite < step, 'no app.json write may follow the ASCII step');
  const validate = src.indexOf('bastien-pruned-validate.js');
  if (validate > 0) {assert.ok(step < validate, 'validate must see the ASCII payload');}
});
