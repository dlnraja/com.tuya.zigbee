'use strict';

/**
 * Bastien 1.0.229 (Homey Pro 2023, fw 13.5.3).
 * Contre quoi:
 * - JSON.parse of a two-byte source (JsonParser<unsigned short> / NewRawTwoByteString).
 * - A large parse while the heap is already critical must not run.
 * - Sleepy scene remote (_TZ3000_vsxvaj9i + TS0043 profile flags): a local
 *   "not a valid attribute" read must not sendFrame. 0xFD listeners are untouched.
 * - Unknown ZCL battery (0 / 255) stays null. A real 200 on zcl200IsPercent is 100.
 *   No percent is invented for a missing report.
 */

const assert = require('assert');
const test = require('node:test');

const {
  toLatin1JsonSource,
  parseJsonLatin1,
  shouldDeferLargeJson,
  installLatin1JsonParse,
  WIDE_HEAP_BYTES,
  WIDE_MIN_CHARS,
} = require('../../lib/utils/latin1-json');
const { sendTuyaMagicPacket } = require('../../lib/zigbee/TuyaMagicPacket');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');

test('wide JSON source is rewritten to latin-1 and parses to the same value', () => {
  const original = { name: 'temp → 20' };
  const text = JSON.stringify(original);
  assert.ok([...text].some((ch) => ch.codePointAt(0) > 255));
  const narrow = toLatin1JsonSource(text);
  for (let i = 0; i < narrow.length; i++) {
    assert.ok(narrow.charCodeAt(i) <= 255, `unit ${narrow.charCodeAt(i)} at ${i}`);
  }
  assert.deepStrictEqual(parseJsonLatin1(text), original);
  assert.deepStrictEqual(parseJsonLatin1(Buffer.from(text, 'utf8')), original);
});

test('ascii buffer stays a one-byte latin-1 string', () => {
  const buf = Buffer.from('{"ok":true}', 'utf8');
  const narrow = toLatin1JsonSource(buf);
  assert.strictEqual(narrow, '{"ok":true}');
  assert.deepStrictEqual(parseJsonLatin1(buf), { ok: true });
});

test('large JSON is deferred only when the heap is already critical', () => {
  assert.strictEqual(shouldDeferLargeJson(WIDE_MIN_CHARS + 1, WIDE_HEAP_BYTES + 1), true);
  assert.strictEqual(shouldDeferLargeJson(100, WIDE_HEAP_BYTES + 1), false);
  assert.strictEqual(shouldDeferLargeJson(WIDE_MIN_CHARS + 1, 1024), false);
});

test('install wraps JSON.parse once and still round-trips a wide string', () => {
  assert.strictEqual(installLatin1JsonParse(), true);
  assert.strictEqual(installLatin1JsonParse(), false);
  const value = JSON.parse('{"k":"a → b"}');
  assert.strictEqual(value.k, 'a → b');
});

test('sleepy scene remote does not sendFrame after a local schema reject', async () => {
  const logs = [];
  let frames = 0;
  const device = {
    log(msg) { logs.push(msg); },
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    getDeviceProfile() {
      return { skipBatteryReporting: true, sceneSwitch: true, noEf00: true, noEf00Tx: true };
    },
  };
  const zcl = {
    endpoints: {
      1: {
        clusters: {
          genBasic: {
            async readAttributes() {
              throw new Error('4 is not a valid attribute of basic');
            },
            async sendFrame() { frames += 1; },
            async writeRaw() { frames += 1; },
          },
        },
      },
    },
  };
  const ok = await sendTuyaMagicPacket(device, zcl, 1, { forceAlways: true });
  assert.strictEqual(ok, false);
  assert.strictEqual(frames, 0);
  assert.ok(logs.some((line) => /no sendFrame/.test(line)));
});

test('a mains device still falls back to sendFrame when the schema rejects the read', async () => {
  let frames = 0;
  const device = {
    log() {},
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    getDeviceProfile() { return { mainsPowered: true }; },
  };
  const zcl = {
    endpoints: {
      1: {
        clusters: {
          genBasic: {
            async readAttributes() {
              throw new Error('4 is not a valid attribute of basic');
            },
            async sendFrame() { frames += 1; },
          },
        },
      },
    },
  };
  const ok = await sendTuyaMagicPacket(device, zcl, 1, { forceAlways: true });
  assert.strictEqual(ok, true);
  assert.strictEqual(frames, 1);
});

test('TS0043 battery scale: 200 is 100%, 255 and empty stay unknown', () => {
  const opts = { manufacturer: '_TZ3000_vsxvaj9i', batteryType: 'CR2032', treat200AsSentinel: false };
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(200, opts), 100);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255, opts), null);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(0xFFFF, opts), null);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(null, opts), null);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(undefined, opts), null);
  assert.notStrictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255, opts), 100);
});
