'use strict';
// P3048: shared automation journal — 72 h read, dedup by key, append, rotation to monthly archives, repair.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const J = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'journal.cjs'));

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'p3048-j-')), 'automation-journal.jsonl');

test('journal: append then dedup on same key + status within 72 h, new status appends', () => {
  const file = tmp();
  assert.strictEqual(J.append({ workflow: 'w', status: 'ok', key: 'k1', summary: 'a' }, { file }).appended, true);
  assert.strictEqual(J.append({ workflow: 'w', status: 'ok', key: 'k1', summary: 'b' }, { file }).appended, false);
  assert.strictEqual(J.append({ workflow: 'w', status: 'fail', key: 'k1', summary: 'c' }, { file }).appended, true);
  assert.strictEqual(J.readAll({ file }).length, 2);
  assert.ok(J.seen('k1', { file }));
});
test('journal: readSince keeps the window, old entries no longer dedup', () => {
  const file = tmp();
  const old = new Date(Date.now() - 80 * 3600000).toISOString();
  fs.writeFileSync(file, `${JSON.stringify({ at: old, workflow: 'w', status: 'ok', key: 'k' })}\n`);
  assert.strictEqual(J.readSince(72, { file }).length, 0);
  assert.strictEqual(J.append({ workflow: 'w', status: 'ok', key: 'k' }, { file }).appended, true);
});
test('journal: unknown status -> info, summary bounded, oversized data truncated', () => {
  const e = J.normalize({ workflow: 'w', status: 'weird', summary: 'x'.repeat(900), data: { big: 'y'.repeat(3000) } });
  assert.strictEqual(e.status, 'info');
  assert.strictEqual(e.summary.length, 400);
  assert.deepStrictEqual(e.data, { truncated: true });
});
test('journal: rotate moves oldest lines to the monthly archive, nothing lost', () => {
  const file = tmp();
  const lines = [];
  for (let i = 0; i < 30; i++) lines.push(JSON.stringify({ at: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}T00:00:00Z`, workflow: 'w', status: 'ok', summary: String(i) }));
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  const r = J.rotate({ file, max: 20, keep: 10 });
  assert.deepStrictEqual(r, { moved: 20, kept: 10 });
  const arch = path.join(path.dirname(file), 'archive', 'automation-journal-2026-09.jsonl');
  assert.strictEqual(fs.readFileSync(arch, 'utf8').trim().split('\n').length, 20);
  assert.strictEqual(J.readAll({ file }).length, 10);
});
test('journal: repair drops corrupt lines only', () => {
  const file = tmp();
  fs.writeFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), workflow: 'w', status: 'ok' })}\n{broken\n`);
  assert.deepStrictEqual(J.repair({ file }), { dropped: 1 });
  assert.strictEqual(J.readAll({ file }).length, 1);
  assert.strictEqual(J.MAX_LINES, 2000);
});
