'use strict';
// P3069 (t585u): every workflow opens with a short, data-driven "about" header in our own words, with credits.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const A = require(path.join(__dirname, '..', '..', 'scripts', 'ci', 'workflow-about.js'));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflow-about.json'), 'utf8'));

test('every workflow has an entry and an up-to-date header', () => {
  const r = A.run('check');
  assert.deepStrictEqual(r.missing, []);
  assert.deepStrictEqual(r.stale, []);
});

test('each entry is short, own words, credits someone', () => {
  for (const [f, e] of Object.entries(data.workflows)) {
    assert.ok(data.groups[e.group], `${f}: unknown group ${e.group}`);
    assert.ok(e.what.length >= 20 && e.what.length <= 220, `${f}: what length ${e.what.length}`);
    assert.ok(!/["“”]/.test(e.what), `${f}: no quoted text in the description`);
    assert.ok(data.groups[e.group].length + (e.also_thanks || []).length >= 1, `${f}: nobody credited`);
  }
});

test('apply is idempotent and only replaces the marked block', () => {
  const blk = A.block({ group: 'ci', what: 'Does a thing for testing purposes only.' }, data.groups);
  const src = '# old comment\nname: x\non: push\n';
  const once = A.apply(src, blk);
  assert.ok(once.startsWith(A.START));
  assert.ok(once.endsWith(src));
  assert.strictEqual(A.apply(once, blk), once);
  const blk2 = A.block({ group: 'ci', what: 'Does another thing for testing purposes.' }, data.groups);
  const twice = A.apply(once, blk2);
  assert.strictEqual(twice.split(A.START).length, 2);
  assert.ok(twice.includes('another thing') && twice.endsWith(src));
});
