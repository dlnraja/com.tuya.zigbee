'use strict';
// P3073 §1: CI signature ledger — categories, idempotent ingest, LRU cap, flakiness, proposals only.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const S = require(path.join(__dirname, '..', '..', 'scripts', 'learning', 'ci-signatures.cjs'));

const line = (i, status, sig, extra = {}) => ({ at: new Date(Date.now() - (100 - i) * 60000).toISOString(), workflow: 'ci-collect', status,
  key: `k${i}`, run: String(i), summary: 'Node 22 runtime tests failed on master (test / Full suite: code-or-test)',
  data: Object.assign({ name: 'Node 22 runtime tests', branch: 'master', sig, message: 'Timeout of 2000ms exceeded' }, extra) });

test('category: common messages land in the right bucket', () => {
  assert.strictEqual(S.category('Error: socket hang up'), 'athom-api');
  assert.strictEqual(S.category('Error: Timeout of 2000ms exceeded.'), 'timeout-flaky');
  assert.strictEqual(S.category('3 failing'), 'test');
  assert.strictEqual(S.category('x', 'Energy compose gate'), 'gate');
  assert.strictEqual(S.category('nothing known here'), 'other');
  assert.strictEqual(S.testTitle('  1) TuyaEF00Manager parses dp 2'), 'TuyaEF00Manager parses dp 2');
});

test('ingest: idempotent, counts statuses, keeps branches bounded', () => {
  const l = S.emptyLedger();
  const entries = [line(1, 'fail', 'a'), line(2, 'transient', 'a', { branch: 'b1' }), line(3, 'recovered', 'a', { branch: 'b2' })];
  assert.strictEqual(S.ingest(l, entries).added, 3);
  assert.strictEqual(S.ingest(l, entries).added, 0);
  const s = l.signatures.a;
  assert.deepStrictEqual([s.fails, s.transient, s.recovered], [1, 1, 1]);
  assert.ok(s.branches.length <= 4 && s.sample.length <= 160);
  assert.ok(S.flakiness(s) > 0);
});

test('ledger stays bounded (300 signatures, 600 keys) and the CLI never throws', () => {
  const l = S.emptyLedger();
  const many = []; for (let i = 0; i < 900; i++) many.push(line(i, 'fail', `s${i}`));
  S.ingest(l, many);
  assert.ok(Object.keys(l.signatures).length <= S.MAX_SIGS);
  assert.ok(l.seenKeys.length <= S.MAX_SEEN_KEYS);
  assert.ok(Array.isArray(S.proposals(l)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3073-'));
  const j = path.join(dir, 'j.jsonl'); fs.writeFileSync(j, [line(1, 'fail', 'z'), line(2, 'fail', 'z')].map((x) => JSON.stringify(x)).join('\n') + '\nnot json\n');
  const l2 = S.ingest(S.loadLedger(path.join(dir, 'none.json')), S.readJournal(j)).ledger;
  assert.strictEqual(S.proposals(l2).length, 1);
  assert.match(S.proposals(l2)[0].hint, /timeout/);
});
