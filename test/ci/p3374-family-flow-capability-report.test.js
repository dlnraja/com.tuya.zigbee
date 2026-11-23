'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { main } = require('../../scripts/ci/family-flow-capability-report');

describe('P3374 family flow/capability report (report only)', () => {
  it('runs and does not remove anything', () => {
    const report = main();
    assert.ok(report.families.length >= 1);
    assert.strictEqual(typeof report.divergenceCount, 'number');
    assert.match(report.note, /Report only/);
  });
});
