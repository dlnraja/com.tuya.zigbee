'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { admitButtonPress } = require('../../lib/coordinator/SimpleButtonGate');

describe('Spec 003 T4: SimpleButtonGate (stable)', () => {
  it('cross-channel copy dropped, same-channel repeat and other press types kept', () => {
    const d = {};
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'physical' }, 1000));
    assert.ok(!admitButtonPress(d, 1, 'single', { source: 'dp' }, 1030));
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'physical' }, 1200));
    assert.ok(admitButtonPress(d, 1, 'double', { source: 'dp' }, 1210));
    assert.ok(admitButtonPress(d, 2, 'single', { source: 'dp' }, 1220));
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'virtual' }, 1230));
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'dp' }, 2000));
  });
  it('repeated seq on same channel dropped', () => {
    const d = {};
    assert.ok(admitButtonPress(d, 1, 'single', { source: 'zcl', seq: 5 }, 1000));
    assert.ok(!admitButtonPress(d, 1, 'single', { source: 'zcl', seq: 5 }, 1100));
  });
});
