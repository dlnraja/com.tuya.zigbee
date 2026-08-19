'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isPollControlCluster,
  shouldBindPollControl,
} = require('../../lib/zigbee/PollControlPolicy');
const { shouldWaitForDefaultResponse } = require('../../lib/zigbee/ZclDefaultResponsePolicy');
const ZigbeeTimeout = require('../../lib/zigbee/ZigbeeTimeout');

describe('PollControlPolicy (stable)', () => {
  it('recognises genPollCtrl aliases', () => {
    assert.equal(isPollControlCluster(0x0020), true);
    assert.equal(isPollControlCluster('genPollCtrl'), true);
    assert.equal(isPollControlCluster('onOff'), false);
  });

  it('skips bind on sleepy TS0203 / remotes', () => {
    assert.equal(shouldBindPollControl({
      driver: { id: 'sensor_contact_zigbee', manifest: { class: 'sensor' } },
      getData: () => ({ productId: 'TS0203' }),
      getSettings: () => ({ zb_model_id: 'TS0203' }),
      getStore: () => ({}),
    }), false);
    assert.equal(shouldBindPollControl({
      driver: { id: 'button_wireless_3', manifest: { class: 'button' } },
      getData: () => ({ productId: 'TS0043' }),
      getSettings: () => ({}),
      getStore: () => ({}),
    }), false);
  });

  it('allows bind on mains switches', () => {
    assert.equal(shouldBindPollControl({
      driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
      getData: () => ({ productId: 'TS0002' }),
      getSettings: () => ({ zb_model_id: 'TS0002' }),
      getStore: () => ({}),
    }), true);
  });
});

describe('ZclDefaultResponsePolicy (stable)', () => {
  it('does not wait for a default response on ZBMINIR2', () => {
    assert.equal(shouldWaitForDefaultResponse({
      getData: () => ({ productId: 'ZBMINIR2' }),
      getSettings: () => ({}),
      getStore: () => ({}),
    }), false);
  });
});

describe('ZigbeeTimeout.asAttributeList (stable)', () => {
  it('wraps a single string instead of spreading characters', () => {
    assert.deepEqual(ZigbeeTimeout.asAttributeList('zoneStatus'), ['zoneStatus']);
  });
});
