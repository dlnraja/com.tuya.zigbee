'use strict';

const assert = require('assert');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const PhysicalButtonMixin = require('../lib/mixins/PhysicalButtonMixin');

function makeDevice({ initialTs = 1234 } = {}) {
  class Base {}
  class Device extends PhysicalButtonMixin(Base) {}

  const d = new Device();
  d._virtualPhysicalDedup = {
    lastVirtualPress: {},
    lastPhysicalPress: { 2: initialTs },
    dedupWindow: 2000,
  };

  // Force early-return branch so we don't need full `homey` flow stubs.
  d.triggerButtonPress = async () => 'ok';
  d.driver = { id: 'switch_2gang' };
  d.log = () => {};
  d.error = () => {};
  return d;
}

describe('PhysicalButtonMixin — virtual presses must not stamp lastPhysicalPress', () => {
  it('skips stamping when tokens.source === "virtual"', async () => {
    const d = makeDevice({ initialTs: 10000 });

    await d._triggerPhysicalFlow(2, 'double', { source: 'virtual' });

    assert.strictEqual(d._virtualPhysicalDedup.lastPhysicalPress[2], 10000);
  });

  it('stamps when tokens.source is undefined (physical default)', async () => {
    const d = makeDevice({ initialTs: 10000 });

    await d._triggerPhysicalFlow(2, 'double', {});

    assert.ok(d._virtualPhysicalDedup.lastPhysicalPress[2] > 10000);
  });
});

