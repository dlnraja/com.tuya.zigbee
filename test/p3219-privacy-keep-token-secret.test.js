'use strict';
// P3219: fetch-diags privacy gate failed (secret-assignment) because a secret key glued to a KEEP_TECH
// token (measure_/alarm_/_TZE...) escaped redact(); the gate then saw it. Redactor must close that gap.
const assert = require('assert');
const p = require('../.github/scripts/privacy-redactor.js');

describe('P3219 privacy redactor: secret key inside a technical token', () => {
  it('redacts a value after a key swallowed by a KEEP token', () => {
    const out = p.redactObject({ m: 'measure_battery.uid=abcdefghij alarm_contact.token=zyxwvuts99' });
    assert.ok(!out.m.includes('abcdefghij') && !out.m.includes('zyxwvuts99'), out.m);
    assert.ok(out.m.includes('measure_battery'), 'technical id kept');
    assert.doesNotThrow(() => p.assertNoLeaks(JSON.stringify(out, null, 2), 't'));
  });
  it('redacts leaking object keys but keeps normal keys', () => {
    const out = p.redactObject({ 'measure_power.sid=abcdefgh12': 1, logIndex: { a: 1 } });
    assert.ok(out.logIndex);
    assert.doesNotThrow(() => p.assertNoLeaks(JSON.stringify(out, null, 2), 't'));
  });
  it('is idempotent and keeps already redacted aliases', () => {
    const s = 'token=[REDACTED_SECRET] [REDACTED_UUID:abcdef12] _TZE284_abcdefgh TS0601 measure_battery';
    assert.strictEqual(p.redact(s), s);
    assert.strictEqual(p.redact(p.redact('uid: secret123')), p.redact('uid: secret123'));
  });
});
