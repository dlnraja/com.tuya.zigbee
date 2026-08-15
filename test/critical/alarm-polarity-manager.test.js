'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  applyPolarity,
  resolvePolarity,
  observeRaw,
  INVERTED_POLARITY,
  NORMAL_POLARITY,
  STORE_KEY,
} = require('../../lib/managers/AlarmPolarityManager');

function mockDevice(opts = {}) {
  const settings = { alarm_polarity: 'auto', ...opts.settings };
  const store = { ...(opts.store || {}) };
  return {
    getSetting: (k) => settings[k],
    setSetting: (k, v) => { settings[k] = v; },
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    unsetStoreValue: async (k) => { delete store[k]; },
    getData: () => ({ manufacturerName: opts.mfr || '', productId: opts.pid || '' }),
    log: () => {},
    _store: store,
    _settings: settings,
  };
}

describe('AlarmPolarityManager', () => {
  it('exposes curated normal and inverted lists', () => {
    assert.ok(INVERTED_POLARITY.some((e) => /26fmupbb/i.test(e)));
    assert.ok(NORMAL_POLARITY.some((e) => /HOBEIAN/i.test(e)));
    assert.ok(!INVERTED_POLARITY.some((e) => e === 'HOBEIAN'));
  });

  it('inverts curated contact mfr by default (auto)', () => {
    const d = mockDevice({ mfr: '_TZ3000_26fmupbb', pid: 'TS0203' });
    const { value, meta } = applyPolarity(d, true, 'contact');
    assert.strictEqual(value, false);
    assert.ok(meta.shouldInvert);
    assert.match(meta.reason, /curated_inverted|auto_xor/);
  });

  it('XOR legacy invert_contact against curated default', () => {
    const d = mockDevice({
      mfr: '_TZ3000_26fmupbb',
      settings: { alarm_polarity: 'auto', invert_contact: true },
    });
    const { value, meta } = applyPolarity(d, true, 'contact');
    assert.strictEqual(value, true); // base invert XOR checkbox → no flip
    assert.ok(meta.forceInvert);
  });

  it('alarm_polarity=inverted always flips', () => {
    const d = mockDevice({
      mfr: 'HOBEIAN',
      settings: { alarm_polarity: 'inverted' },
    });
    const { value, meta } = applyPolarity(d, false, 'contact');
    assert.strictEqual(value, true);
    assert.strictEqual(meta.reason, 'setting_alarm_polarity_inverted');
  });

  it('alarm_polarity=normal never flips even for listed invert mfr', () => {
    const d = mockDevice({
      mfr: '_TZ3000_26fmupbb',
      settings: { alarm_polarity: 'normal' },
    });
    const { value } = applyPolarity(d, true, 'water');
    assert.strictEqual(value, true);
  });

  it('SOS inverted list flips press detection', () => {
    const d = mockDevice({
      mfr: '_TZ3000_ssp0maqm',
      pid: 'TS0215A',
      settings: { alarm_polarity: 'auto' },
    });
    const { value, meta } = applyPolarity(d, false, 'sos');
    assert.strictEqual(value, true);
    assert.ok(meta.shouldInvert);
  });

  it('smart learn marks inverted when raw stays true at idle (contact)', async () => {
    const d = mockDevice({ mfr: '_TZ3000_unknownxyz', pid: 'TS0203' });
    // Seed startedAt in the past so minElapsed passes
    d._store[STORE_KEY] = {
      profile: 'contact',
      startedAt: Date.now() - 20 * 60 * 1000,
      samples: 0,
      rawTrue: 0,
      rawFalse: 0,
      clearEvents: 0,
      alarmEvents: 0,
      inverted: null,
      decidedAt: null,
    };
    for (let i = 0; i < 10; i++) {
      observeRaw(d, true, 'contact');
    }
    const st = d.getStoreValue(STORE_KEY);
    assert.strictEqual(st.inverted, true);
    const { value } = applyPolarity(d, true, 'contact');
    assert.strictEqual(value, false);
  });

  it('resolvePolarity reports mfr/pid from device data', () => {
    const d = mockDevice({ mfr: '_TZ3000_n2egfsli', pid: 'TS0203' });
    const meta = resolvePolarity(d, 'contact');
    assert.ok(/n2egfsli/i.test(meta.mfr));
    assert.ok(meta.listedInvert);
  });

  it('listPolarityCatalog exposes normal and inverted catalogs', () => {
    const { listPolarityCatalog } = require('../../lib/managers/AlarmPolarityManager');
    const cat = listPolarityCatalog();
    assert.ok(cat.normal.length >= 5);
    assert.ok(cat.inverted.length >= 8);
    assert.ok(cat.modes.includes('auto'));
  });

  it('SOS smart learn marks inverted on sticky raw-true idle', async () => {
    const d = mockDevice({ mfr: '_TZ3000_unknownsos', pid: 'TS0215A' });
    const started = Date.now() - 25 * 60 * 1000;
    d._store[STORE_KEY] = {
      profile: 'sos',
      startedAt: started,
      samples: 0,
      rawTrue: 0,
      rawFalse: 0,
      clearEvents: 0,
      alarmEvents: 0,
      transitions: 0,
      pulseCount: 0,
      lastRaw: true,
      lastChangeAt: started,
      stickyTrueMs: 16 * 60 * 1000,
      stickyFalseMs: 0,
      inverted: null,
      decidedAt: null,
      confidence: null,
    };
    for (let i = 0; i < 6; i++) {
      observeRaw(d, true, 'sos');
    }
    const st = d.getStoreValue(STORE_KEY);
    assert.strictEqual(st.inverted, true);
    assert.ok(st.confidence >= 0.6);
  });

  it('curated normal list blocks weak invert learn', () => {
    const d = mockDevice({
      mfr: 'HOBEIAN',
      pid: 'TS0203',
      store: {
        [STORE_KEY]: {
          profile: 'contact',
          inverted: true,
          confidence: 0.4,
          decidedAt: Date.now(),
        },
      },
    });
    const meta = resolvePolarity(d, 'contact');
    assert.strictEqual(meta.shouldInvert, false);
    assert.match(meta.reason, /curated_normal/);
  });
});
