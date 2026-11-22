'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const { measurementRefreshIds, refreshPayload } = require('../lib/tuya-local/SwitchDpRefresh');
const { refreshPayload: planRefresh } = require('../lib/tuya-local/TuyaCommandPlan');

describe('P3384 SwitchDpRefresh (forum 154077 #499, Nedis WIFIPO120FWT)', () => {
  it('drops the switch DP from an UPDATEDPS list', () => {
    assert.deepStrictEqual(measurementRefreshIds([1, 9, 18, 19, 20, 26, 38]), [9, 18, 19, 20, 26, 38]);
  });

  it('defaults to measurement DPs when the list is empty', () => {
    const payload = refreshPayload([]);
    assert.deepStrictEqual(payload.dpId, [18, 19, 20]);
    assert.ok(!payload.dpId.includes(1));
  });

  it('keeps TuyaCommandPlan.refreshPayload measurement default free of DP 1', () => {
    assert.deepStrictEqual(planRefresh([]).dpId, [18, 19, 20]);
  });
});
