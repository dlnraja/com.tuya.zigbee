'use strict';
/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { targetBranch, resolveBaseRef } = require('../scripts/ci/couple-removal-guard.js');

describe('P3195 couple-removal guard compares against the pushed branch baseline', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3195-'));
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const app = (id) => fs.writeFileSync(path.join(tmp, 'app.json'), JSON.stringify({ id }));
  it('bastien app id -> origin/bastien-home, never origin/master (detached HEAD)', () => {
    app('com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(targetBranch({}, tmp), 'bastien-home');
    const seen = [];
    const ref = resolveBaseRef((...a) => { seen.push(a[2]); return 'abc\n'; }, ['n', 's'], {}, tmp);
    assert.strictEqual(ref, 'abc');
    assert.deepStrictEqual(seen, ['origin/bastien-home']);
  });
  it('PUSH_RETRY_BRANCH wins; stable id maps to stable-v5; explicit arg wins', () => {
    app('com.dlnraja.tuya.zigbee.stable');
    assert.strictEqual(targetBranch({}, tmp), 'stable-v5');
    assert.strictEqual(targetBranch({ PUSH_RETRY_BRANCH: 'bastien-home' }, tmp), 'bastien-home');
    assert.strictEqual(resolveBaseRef(() => { throw new Error('x'); }, ['n', 's', 'REF'], {}, tmp), 'REF');
  });
  it('no fallback to master when the own baseline is missing', () => {
    app('com.dlnraja.tuya.zigbee.bastien');
    assert.strictEqual(resolveBaseRef(() => { throw new Error('no ref'); }, ['n', 's'], {}, tmp), null);
  });
});
