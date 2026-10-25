'use strict';
// P3048 (t539u c-e): self-repair of corrupt pointers, bounded caches, additive learned patterns.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'self-maintain.cjs'));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'p3048-s-'));

test('checkPointer: valid ok, missing reported, corrupt reset to a skeleton when no git history', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'd'));
  fs.writeFileSync(path.join(root, 'd', 'ok.json'), '{"a":1}');
  fs.writeFileSync(path.join(root, 'd', 'bad.json'), '{"a":');
  fs.writeFileSync(path.join(root, 'd', 'arr.json'), '[1,');
  assert.strictEqual(S.checkPointer('d/ok.json', { root }).state, 'ok');
  assert.strictEqual(S.checkPointer('d/none.json', { root }).state, 'missing');
  assert.strictEqual(S.checkPointer('d/bad.json', { root, dry: true }).state, 'reset');
  assert.strictEqual(fs.readFileSync(path.join(root, 'd', 'bad.json'), 'utf8'), '{"a":', 'dry run writes nothing');
  assert.strictEqual(S.checkPointer('d/bad.json', { root }).state, 'reset');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(root, 'd', 'bad.json'), 'utf8')), {});
  S.checkPointer('d/arr.json', { root });
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(root, 'd', 'arr.json'), 'utf8')), []);
});
test('capObject / capFile: keep the newest entries of the OCR hash cache', () => {
  const r = S.capObject({ a: { at: '2026-01-01' }, b: { at: '2026-03-01' }, c: { at: '2026-02-01' } }, 2);
  assert.deepStrictEqual(Object.keys(r.obj), ['b', 'c']);
  assert.strictEqual(r.dropped, 1);
  const root = tmp();
  fs.writeFileSync(path.join(root, 'c.json'), JSON.stringify({ byUrl: { u1: 'h1', u2: 'h2', u3: 'h3' }, byHash: {} }));
  assert.strictEqual(S.capFile('c.json', 2, { root }).dropped, 1);
  assert.deepStrictEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'c.json'), 'utf8')).byUrl), ['u2', 'u3']);
});
test('learnPatterns: additive, from recovered journal entries only, dry writes nothing', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'data', 'automation'), { recursive: true });
  const file = path.join(root, 'data', 'automation', 'failure-patterns.json');
  fs.writeFileSync(file, JSON.stringify({ note: 'n', transient: [{ literal: 'already known literal' }] }));
  const at = new Date().toISOString();
  const entries = ['1', '2'].map((run) => ({ at, status: 'recovered', run, data: { message: 'mirror flake while restoring toolchain' } }));
  assert.deepStrictEqual(S.learnPatterns({ root, entries, dry: true }).learned.length, 1);
  assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).transient.length, 1);
  const r = S.learnPatterns({ root, entries });
  assert.strictEqual(r.total, 2);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(j.note, 'n');
  assert.strictEqual(j.transient[0].literal, 'already known literal');
});
test('POINTERS list covers the forum, OCR, sources and bisect cursors', () => {
  for (const p of ['data/leads/forum-lastseen.json', 'data/leads/ocr-hash-cache.json', 'docs/knowledge/athom-bisect-state.json']) assert.ok(S.POINTERS.includes(p), p);
});
