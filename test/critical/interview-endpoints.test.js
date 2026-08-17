'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyInterview, countOnOffGangs } = require('../../lib/utils/interviewEndpoints');

function onOffEp() {
  return { clusters: { onOff: {} }, inputClusters: [6] };
}

describe('Homey interview endpoint classification', () => {
  it('does not count Green Power EP 242 as a gang on TS0002', () => {
    const node = {
      modelId: 'TS0002',
      endpoints: { 1: onOffEp(), 2: onOffEp(), 242: { clusters: { greenPower: {} } } },
    };
    assert.equal(countOnOffGangs(node), 2);
    const c = classifyInterview(node);
    assert.equal(c.class, 'switch');
    assert.equal(c.gangs, 2);
    assert.equal(c.driverHint, 'switch_2gang');
  });

  it('keeps TS0043 as a remote even with 4 OnOff endpoints (INT-170)', () => {
    const node = {
      modelId: 'TS0043',
      endpoints: {
        1: onOffEp(), 2: onOffEp(), 3: onOffEp(), 4: onOffEp(),
      },
    };
    const c = classifyInterview(node);
    assert.equal(c.class, 'button');
    assert.equal(c.driverHint, 'button_wireless_3');
  });

  it('does not treat leftover endpoint count as 3-gang for TS0002', () => {
    const node = {
      modelId: 'TS0002',
      endpoints: { 1: onOffEp(), 2: onOffEp(), 3: { clusters: {} } },
    };
    assert.equal(classifyInterview(node).gangs, 2);
  });

  it('classifies TS0601 as DP, not ZCL gangs', () => {
    const c = classifyInterview({
      modelId: 'TS0601',
      endpoints: { 1: { clusters: { tuya: {}, onOff: {} }, inputClusters: [6, 61184] } },
    });
    assert.equal(c.class, 'tuya_dp');
  });
});
