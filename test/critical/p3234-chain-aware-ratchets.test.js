'use strict';
// P3234 (02/11/2026 Paris): ratchets treat a continuation chain as one logical driver.
// Master went red on 33dbe44693 (curtain_motor_2): EF00 bindings ratchet and compose-shadow ratchet
// counted the continuation as a brand-new driver. A real new driver must still trip them.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const path = require('path');
const { fromObject } = require('../../lib/drivers/DriverContinuations');
const audit = require('../../scripts/audit/binding-presence-audit');

describe('P3234 chain-aware ratchets', () => {
  it('audit exposes logical EF00 bindings: a continuation folds into its root', () => {
    const r = audit.audit(path.join(__dirname, '..', '..'));
    assert.ok(Array.isArray(r.ef00LogicalBindings));
    assert.ok(r.ef00LogicalBindings.length <= r.ef00Bindings.length);
    assert.ok(!r.ef00LogicalBindings.includes('curtain_motor_2'));
  });

  it('rootOf maps a continuation to its root and leaves a plain new driver alone', () => {
    const c = fromObject({ drivers: { a: { full: true, continuation: 'a_2' }, a_2: { continuationOf: 'a', index: 2 } } });
    const ids = ['a', 'a_2', 'brand_new'];
    assert.deepStrictEqual([...new Set(ids.map(c.rootOf))], ['a', 'brand_new']);
  });
});
