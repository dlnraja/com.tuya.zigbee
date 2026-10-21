'use strict';
const assert = require('assert');
const { withTransientRetry, isTransientNetError } = require('../lib/utils/transientNetRetry');
const sleep = async () => {};

describe('P2930e bounded transient retry for cloud HTTPS', () => {
  it('classifies socket errors', () => {
    assert.ok(isTransientNetError(new Error('socket hang up')));
    assert.ok(isTransientNetError({ code: 'ECONNRESET', message: 'read' }));
    assert.ok(!isTransientNetError(new Error('sign invalid')));
  });
  it('retries a GET at most twice then succeeds', async () => {
    let n = 0;
    const r = await withTransientRetry(async () => { if (++n < 3) {throw new Error('socket hang up');} return 'ok'; }, { method: 'GET', sleep });
    assert.strictEqual(r, 'ok'); assert.strictEqual(n, 3);
  });
  it('gives up after the budget', async () => {
    let n = 0;
    await assert.rejects(withTransientRetry(async () => { n++; throw new Error('ECONNRESET'); }, { method: 'GET', sleep }));
    assert.strictEqual(n, 3);
  });
  it('never retries a POST (no double command)', async () => {
    let n = 0;
    await assert.rejects(withTransientRetry(async () => { n++; throw new Error('socket hang up'); }, { method: 'POST', sleep }));
    assert.strictEqual(n, 1);
  });
  it('retries resolved transient results and never non-transient errors', async () => {
    let n = 0;
    const r = await withTransientRetry(async () => (++n < 2 ? { success: false, msg: 'socket hang up' } : { success: true }), { method: 'GET', sleep, resultIsTransient: (x) => x.success === false && isTransientNetError(x.msg) });
    assert.deepStrictEqual(r, { success: true }); n = 0;
    await assert.rejects(withTransientRetry(async () => { n++; throw new Error('permission deny'); }, { method: 'GET', sleep }));
    assert.strictEqual(n, 1);
  });
});
