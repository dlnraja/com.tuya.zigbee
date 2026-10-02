'use strict';
/**
 * P2793 — case-insensitive runtime lookups (shared helper) + coverage-audit strict rule.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const T = require('../../lib/utils/TuyaNormalizer');

test('ciGet: exact key first, then case-insensitive, no data copy', () => {
  const map = { _TZE200_AbCdEfGh: { a: 1 }, _tze200_abcdefgh: { b: 2 } };
  assert.deepStrictEqual(T.ciGet(map, '_TZE200_AbCdEfGh'), { a: 1 });
  assert.deepStrictEqual(T.ciGet(map, '_tze200_abcdefgh'), { b: 2 });
  const m2 = { _TZ3000_abcdefgh: 7 };
  assert.strictEqual(T.ciGet(m2, '_tz3000_ABCDEFGH'), 7);
  assert.strictEqual(T.ciKey(m2, '_TZ3000_ABCDEFGH'), '_TZ3000_abcdefgh');
  assert.strictEqual(T.ciHas(m2, '_tz3000_abcdefgh'), true);
  assert.strictEqual(T.ciGet(m2, '_tz3000_zzzzzzzz'), undefined);
  assert.strictEqual(T.ciGet(m2, ''), undefined);
  assert.strictEqual(T.ciGet(null, 'x'), undefined);
  assert.strictEqual(Object.keys(m2).length, 1, 'helper never writes into the map');
});

test('ciGet: index refreshes when the map grows', () => {
  const m = { _TZ3000_aaaaaaaa: 1 };
  assert.strictEqual(T.ciGet(m, '_TZ3000_BBBBBBBB'), undefined);
  m._TZ3000_bbbbbbbb = 2;
  assert.strictEqual(T.ciGet(m, '_TZ3000_BBBBBBBB'), 2);
});

test('includesCI matches case variants', () => {
  assert.strictEqual(T.includesCI(['_TZE204_Abc12345'], '_tze204_abc12345'), true);
  assert.strictEqual(T.includesCI(['_TZE204_abc12345'], '_tze204_abc99999'), false);
});

test('runtime tables keyed by manufacturerName are read through the shared helper', () => {
  const files = [
    'lib/battery/BatteryProfileDatabase.js', 'lib/battery/UnifiedBatteryHandler.js',
    'lib/devices/InPlaceIdentityLayer.js', 'lib/helpers/DeviceHintsDatabase.js',
    'lib/tuya/EnrichedDPMappings.js', 'lib/tuya/TuyaUnifiedParser.js', 'lib/tuya/MCUFormatDatabase.js',
    'lib/tuya/TuyaUniversalMapper.js', 'lib/configs/IntelligentDeviceConfig.js', 'lib/zigbee/GreenPowerManager.js',
  ];
  for (const f of files) {
    const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(/_ciGet\(/.test(s), `${f} uses ciGet`);
  }
});

test('coverage-audit strict rule: one same-class driver, no couple on two drivers', () => {
  const A = require('../../scripts/leads/coverage-audit.js');
  const mk = (id, cls, mfrs, pids) => [id, { id, cls, mfrs: new Set(mfrs.map((m) => m.toLowerCase())), raw: mfrs, pids: new Set(pids) }];
  const drivers = new Map([
    mk('climate', 'sensor', ['_TZ3000_aaaaaaaa'], ['TS0601', 'TS0201']),
    mk('contact', 'sensor', ['_TZ3000_bbbbbbbb'], ['TS0203']),
    mk('contact2', 'sensor', ['_TZ3000_cccccccc'], ['TS0203', 'TS0201']),
    mk('plug', 'socket', ['_TZ3000_dddddddd'], ['TS011F']),
  ]);
  const idx = A.buildIndex(drivers);
  // contact2 also lists TS0201, already matched by climate → would duplicate a couple → only "contact" is eligible
  assert.deepStrictEqual(A.decide(drivers, idx, '_TZ3000_AAAAAAAA', 'TS0203').driver, 'contact');
  assert.strictEqual(A.decide(drivers, idx, '_TZ3000_aaaaaaaa', 'TS0201').status, 'covered');
  assert.strictEqual(A.decide(drivers, idx, '_TZ3000_aaaaaaaa', 'TS011F').status, 'lead', 'class mismatch');
  assert.strictEqual(A.decide(drivers, idx, '_TZ3000_aaaaaaaa', 'TS0601').status, 'covered');
  assert.strictEqual(A.decide(drivers, idx, '_TZ3000_zzzzzzzz', 'TS0203').status, 'skip', 'new mfr is strict-apply domain');
});

test('coverage-audit is wired into the enrichment workflow (capped)', () => {
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/oss-lan-source-enrich.yml'), 'utf8');
  assert.ok(/scripts\/leads\/coverage-audit\.js --max=/.test(wf));
});
