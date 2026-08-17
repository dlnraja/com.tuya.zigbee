'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isPollControlCluster,
  shouldBindPollControl,
  shouldAnswerCheckin,
} = require('../../lib/zigbee/PollControlPolicy');
const { shouldWaitForDefaultResponse } = require('../../lib/zigbee/ZclDefaultResponsePolicy');
const ZigbeeTimeout = require('../../lib/zigbee/ZigbeeTimeout');

function sleepyContact() {
  return {
    driver: { id: 'sensor_contact_zigbee', manifest: { class: 'sensor' } },
    getData: () => ({ productId: 'TS0203', manufacturerName: '_TZ3000_7tbsruql' }),
    getSettings: () => ({ zb_model_id: 'TS0203' }),
    getStore: () => ({}),
  };
}

function mainsSwitch() {
  return {
    driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
    getData: () => ({ productId: 'TS0002', manufacturerName: '_TZ3000_ywubfuvt' }),
    getSettings: () => ({ zb_model_id: 'TS0002' }),
    getStore: () => ({}),
    mainsPowered: true,
  };
}

describe('PollControlPolicy', () => {
  it('recognises genPollCtrl aliases', () => {
    assert.equal(isPollControlCluster(0x0020), true);
    assert.equal(isPollControlCluster(32), true);
    assert.equal(isPollControlCluster('pollControl'), true);
    assert.equal(isPollControlCluster('genPollCtrl'), true);
    assert.equal(isPollControlCluster('onOff'), false);
  });

  it('skips bind and check-in on sleepy TS0203 / remotes', () => {
    assert.equal(shouldBindPollControl(sleepyContact()), false);
    assert.equal(shouldAnswerCheckin(sleepyContact()), false);
    assert.equal(shouldBindPollControl({
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
      getData: () => ({ productId: 'TS0043' }),
      getSettings: () => ({}),
      getStore: () => ({}),
    }), false);
  });

  it('allows bind on mains switches', () => {
    assert.equal(shouldBindPollControl(mainsSwitch()), true);
  });
});

describe('ZclDefaultResponsePolicy', () => {
  it('does not wait for a default response on ZBMINIR2 / BASICZBR3', () => {
    assert.equal(shouldWaitForDefaultResponse({
      getData: () => ({ productId: 'ZBMINIR2' }),
      getSettings: () => ({}),
      getStore: () => ({}),
    }), false);
    assert.equal(shouldWaitForDefaultResponse({
      getData: () => ({ productId: 'TS0002' }),
      getSettings: () => ({}),
      getStore: () => ({}),
    }), true);
  });
});

describe('ZigbeeTimeout.asAttributeList', () => {
  it('wraps a single string instead of spreading characters', () => {
    assert.deepEqual(ZigbeeTimeout.asAttributeList('zoneStatus'), ['zoneStatus']);
    assert.deepEqual(ZigbeeTimeout.asAttributeList(['zoneStatus', 'zoneType']), ['zoneStatus', 'zoneType']);
  });
});
