'use strict';
// P3020: mocha-style `this.skip()` / `this.timeout()` keep working under node --test via the dual runner.
const { describe, it, before } = require('../_support/dual-runner');
const assert = require('assert');

describe('P3020 dual runner context', function suite() {
  this.timeout(1000);
  let ready = false;
  before(() => { ready = true; });
  it('runs hooks before tests', () => { assert.ok(ready); });
  it('this.skip() stops the test without failing it', function t() {
    this.skip();
    throw new Error('must not run after skip');
  });
  it('done-callback style is honoured', (done) => { setImmediate(() => done()); });
  it('async style is honoured', async () => { await new Promise((r) => setImmediate(r)); assert.ok(true); });

  it('node:test skip option is honoured (does not fail the suite)', { skip: 'p3020 dual-runner skip-option probe' }, () => {
    throw new Error('must not run when skip is set');
  });
  it('node:test skip:false still runs', { skip: false }, () => { assert.ok(true); });
});
