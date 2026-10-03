'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { syncTuyaOnOffSettings, normalizeEnum, parseOutgoingEnum } = require('../../lib/helpers/TuyaOnOffSettingsSync');

function dev(attrs) {
  const applied = [];
  return {
    applied,
    log() {},
    setSettings: async (s) => { applied.push(s); },
    zclNode: { endpoints: { 1: { clusters: { onOff: {
      readAttributes: async ([a]) => { if (!(a in attrs)) throw new Error('UNSUPPORTED_ATTRIBUTE'); return { [a]: attrs[a] }; },
    } } } } },
  };
}

describe('Spec 006: Tuya OnOff power-on state sync', () => {
  it('normalises numeric, enum names and digit strings', () => {
    assert.strictEqual(normalizeEnum('relayStatus', 'Remember'), 2);
    assert.strictEqual(normalizeEnum('relayStatus', 'on'), 1);
    assert.strictEqual(normalizeEnum('relayStatus', '0'), 0);
    assert.strictEqual(normalizeEnum('relayStatus', 7), null);
    assert.strictEqual(normalizeEnum('relayStatus', 'weird'), null);
  });
  it('relayStatus still synced when childLock is unsupported', async () => {
    const d = dev({ relayStatus: 'Remember', indicatorMode: 'Status' });
    const r = await syncTuyaOnOffSettings(d);
    assert.deepStrictEqual(r, { relay_status: '2', indicator_mode: '1' });
  });
  it('unknown values leave settings untouched; nothing applied when none supported', async () => {
    const d = dev({ relayStatus: 9 });
    assert.deepStrictEqual(await syncTuyaOnOffSettings(d), {});
    assert.strictEqual(d.applied.length, 0);
  });
  it('strict outgoing values', () => {
    assert.strictEqual(parseOutgoingEnum('relayStatus', '1'), 1);
    assert.throws(() => parseOutgoingEnum('relayStatus', 'x'));
  });
});
