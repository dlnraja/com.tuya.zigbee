'use strict';
// P3205b (t779u): user diag reports without a stack are tagged with the user-visible symptom, not dropped.
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const t = require('../scripts/autonomy/crash-triage');

describe('P3205b crash triage tags user-visible symptoms', () => {
  it('unknown/generic device report becomes paired-generic-or-unreadable', () => {
    const r = t.records({ diagnostics: [{ type: 'diag', userMessage: '_TZE284_xxxxxxxx soil sensor unknown', logIdShort: 'aaaa1111', appVersion: 'v9.0.1599' }] });
    assert.strictEqual(r.length, 1);
    assert.strictEqual(r[0].msg, 'user-report: paired-generic-or-unreadable');
    assert.ok(!/soil/.test(r[0].msg), 'user text is not quoted');
  });
  it('paired but not readable (NL) is the same symptom', () => {
    assert.strictEqual(t.symptomOf('Krijg de energymeter gekoppeld, maar kan hem niet uitlezen.'), 'paired-generic-or-unreadable');
  });
  it('crash wording or crashInfo becomes app-crash', () => {
    assert.strictEqual(t.symptomOf('the app crashes again'), 'app-crash');
    const r = t.records({ diagnostics: [{ userMessage: 'hello', crashInfo: { error: 'TypeError: boom' } }] });
    assert.ok(r.some((x) => x.msg === 'user-report: app-crash'));
    assert.ok(r.some((x) => /TypeError/.test(x.msg)), 'stack record still kept');
  });
  it('unfetched diag log id is reported, gate skips still dropped', () => {
    const r = t.records({ entries: [{ uuid: 'c0ffee00-0000-4000-8000-000000000000', found: false, via: null, fetchedAt: 'x' }],
      results: [{ status: 'skip', reason: 'input_missing' }] });
    assert.deepStrictEqual(r.map((x) => x.msg), ['user-report: diag-log-unfetched']);
  });
});
