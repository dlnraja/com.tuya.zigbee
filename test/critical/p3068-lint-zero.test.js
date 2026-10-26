'use strict';
// P3068: pre-existing ESLint errors removed without behaviour change; this test is the ratchet (0 errors, may not grow)
// and pins the time-sync payload bytes (no-case-declarations fix wrapped each case body in a block).
process.env.TZ = 'UTC';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ZERO_ERROR_FILES = ['lib/tuya/TuyaEF00Manager.js', 'lib/utils/SleepyDeviceInit.js', 'scripts/ci/publish-size-gate.cjs'];
// Golden bytes captured from the pre-change implementation (2026-10-26T17:05:09Z, timezoneMinutes 60, TZ=UTC).
const GOLDEN = {"zigbee_2000":"327244c5","zigbee_2000_local":"327252d5","zigbee_2000_le":"c5447232","unix_1970":"6adf8845","unix_1970_local":"6adf9655","unix_1970_le":"4588df6a","unix_1970_ms":"000001a1792c4d88","tuya_timestamp":"327252d5327244c5","tuya_ts_unix":"6adf96556adf8845","tuya_standard":"1a0a1a11050901","tuya_utc_string":"1a0a1a11050901","tuya_mcu":"00071a0a1a11050901","tuya_seq_10":"00006adf88456adf9655","tuya_seq_10_e2k":"0000327244c5327252d5","tuya_extended":"1a0a1a11050901003c","tuya_full_tz":"1a0a1a11050901010000","tuya_gateway":"07ea0a1a1105090101000000","auto":"327252d5327244c5","bogus":"327252d5327244c5"};

test('lint ratchet: zero ESLint errors in the cleaned files', async () => {
  const { ESLint } = require(require.resolve('eslint', { paths: [ROOT] }));
  const results = await new ESLint({ cwd: ROOT }).lintFiles(ZERO_ERROR_FILES.map((f) => path.join(ROOT, f)));
  for (const r of results) {
    const errs = r.messages.filter((m) => m.severity === 2).map((m) => `${m.line}:${m.ruleId}`);
    assert.deepStrictEqual(errs, [], `${path.relative(ROOT, r.filePath)} has ESLint errors`);
  }
});

test('_buildTimePayload bytes unchanged for every TIME_FORMAT (+ unknown -> default)', (t) => {
  const FIX = Date.UTC(2026, 9, 26, 17, 5, 9);
  t.mock.timers.enable({ apis: ['Date'], now: FIX });
  try {
    const M = require(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'));
    const mgr = Object.create(M.prototype);
    mgr._log = () => {};
    mgr.device = { log() {}, getSetting() {} };
    for (const [fmt, hex] of Object.entries(GOLDEN)) {
      assert.strictEqual(mgr._buildTimePayload(fmt, { timezoneMinutes: 60 }).toString('hex'), hex, fmt);
    }
    assert.strictEqual(Object.keys(GOLDEN).length, Object.keys(M.TIME_FORMATS).length + 1);
  } finally {
    t.mock.timers.reset();
  }
});

test('SleepyDeviceInit and EF00 manager still load and expose their API', () => {
  const S = require(path.join(ROOT, 'lib/utils/SleepyDeviceInit.js'));
  assert.ok(S && Object.keys(S).length > 0);
  const M = require(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'));
  for (const fn of ['_buildTimePayload', '_cleanupFragments', 'parseTuyaFrame', 'setupDatapointListener']) { assert.strictEqual(typeof M.prototype[fn], 'function', fn); }
});
