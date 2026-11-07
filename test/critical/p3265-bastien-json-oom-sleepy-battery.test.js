'use strict';

/**
 * Bastien 1.0.229 review. The OOM file is still unknown.
 * Contre quoi:
 * - JSON.parse stays the native function (reviver, unicode, \\u escapes).
 * - Large-load notes keep a label and a size, never payload text, and stay bounded.
 * - An exact sleepy-button profile does not sendFrame after a local schema reject.
 * - noEf00 / skipBatteryReporting alone (incomplete interview or another class)
 *   still allows the Tuya sendFrame path.
 * - A button listener registered before the failed handshake is still there.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const note = require('../../lib/utils/json-load-note');
const { sendTuyaMagicPacket, isExactSleepyButtonProfile } = require('../../lib/zigbee/TuyaMagicPacket');
const { parseJsonBuffer } = require('../../lib/performance/IntelligentLazyLoad');
const MemwarnGuard = require('../../lib/utils/MemwarnGuard');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');

const nativeParse = JSON.parse;

function sleepyDevice(extra = {}) {
  const logs = [];
  return {
    logs,
    log(msg) { logs.push(msg); },
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    driver: { id: 'button_wireless_3' },
    getDeviceProfile() {
      return { skipBatteryReporting: true, sceneSwitch: true, ...extra };
    },
  };
}

function basicCluster(behavior) {
  return {
    endpoints: {
      1: {
        clusters: {
          genBasic: {
            async readAttributes() {
              behavior.reads += 1;
              if (behavior.fail) {throw new Error(behavior.fail);}
              return { manufacturerName: 'x', modelIdentifier: 'TS0043' };
            },
            async sendFrame() { behavior.frames += 1; },
            async writeRaw() { behavior.frames += 1; },
          },
        },
      },
    },
  };
}

test('JSON.parse is not replaced and keeps reviver plus unicode escapes', () => {
  assert.strictEqual(JSON.parse, nativeParse);
  assert.strictEqual(fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8').includes('installLatin1JsonParse'), false);
  const text = '{"room":"s\\u00e9jour","arrow":"temp \\u2192 20","n":2}';
  const parsed = JSON.parse(text, (key, value) => (typeof value === 'string' ? value.toUpperCase() : value));
  assert.strictEqual(parsed.room, 'SÉJOUR');
  assert.strictEqual(parsed.arrow, 'TEMP → 20');
  assert.strictEqual(parsed.n, 2);
  const buf = Buffer.from('{"ok":true,"name":"café"}', 'utf8');
  assert.deepStrictEqual(parseJsonBuffer(buf), { ok: true, name: 'café' });
});

test('json load notes are bounded and contain no payload', () => {
  note._resetJsonLoadNotesForTests();
  const secret = 'user@example.com living-room';
  for (let i = 0; i < 40; i++) {
    note.noteJsonLoad(`load-${i}-${secret}`, 1000 + i);
  }
  const recent = note.recentJsonLoads();
  assert.strictEqual(recent.length, note.MAX_NOTES);
  const dumped = JSON.stringify(recent);
  assert.strictEqual(dumped.includes('example.com'), false);
  assert.strictEqual(dumped.includes('living-room'), false);
  assert.strictEqual(recent[0].label, 'redacted-label');
  const big = note.noteJsonLoad('driver-mapping-database', note.LOG_ONCE_BYTES);
  assert.strictEqual(big.announce, true);
  assert.strictEqual(note.noteJsonLoad('driver-mapping-database', note.LOG_ONCE_BYTES + 10).announce, undefined);
  assert.ok(note.jsonLoadSummary().includes('driver-mapping-database:'));
});

test('MEMWARN line can name a large json label and still clears', () => {
  note._resetJsonLoadNotesForTests();
  note.noteJsonLoad('fp:fingerprints.json', 900000);
  const lines = [];
  const guard = new MemwarnGuard({ log: (m) => lines.push(m) });
  let n = 0;
  guard.register('cache', () => { n += 1; });
  guard.handle({ count: 0, limit: 0 });
  assert.strictEqual(n, 1);
  assert.match(lines[0], /cleared=cache/);
  assert.match(lines[0], /json=fp:fingerprints.json:900000/);
  assert.strictEqual(lines[0].includes('@'), false);
});

test('exact sleepy button does not sendFrame; listeners stay', async () => {
  const device = sleepyDevice();
  const presses = [];
  device.on = (ev, fn) => { presses.push(ev); return fn; };
  assert.strictEqual(isExactSleepyButtonProfile(device), true);
  const behavior = { reads: 0, frames: 0, fail: '4 is not a valid attribute of basic' };
  const ok = await sendTuyaMagicPacket(device, basicCluster(behavior), 1, { forceAlways: true });
  assert.strictEqual(ok, false);
  assert.strictEqual(behavior.reads, 1);
  assert.strictEqual(behavior.frames, 0);
  assert.deepStrictEqual(presses, []);
  assert.ok(device.logs.some((line) => /no sendFrame/.test(line)));
});

test('incomplete interview and non-button sleepy flags still allow sendFrame', async () => {
  const incomplete = {
    log() {},
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    _noEf00: true,
    getDeviceProfile() { return { noEf00: true, noEf00Tx: true }; },
  };
  assert.strictEqual(isExactSleepyButtonProfile(incomplete), false);
  const b1 = { reads: 0, frames: 0, fail: '4 is not a valid attribute of basic' };
  assert.strictEqual(await sendTuyaMagicPacket(incomplete, basicCluster(b1), 1, { forceAlways: true }), true);
  assert.strictEqual(b1.frames, 1);

  const climate = {
    log() {},
    getStoreValue() { return undefined; },
    setStoreValue() { return Promise.resolve(); },
    driver: { id: 'climate_sensor' },
    getDeviceProfile() { return { skipBatteryReporting: true }; },
  };
  assert.strictEqual(isExactSleepyButtonProfile(climate), false);
  const b2 = { reads: 0, frames: 0, fail: '4 is not a valid attribute of basic' };
  assert.strictEqual(await sendTuyaMagicPacket(climate, basicCluster(b2), 1, { forceAlways: true }), true);
  assert.strictEqual(b2.frames, 1);
});

test('battery sentinels stay unknown for the known TS0043 profile inputs', () => {
  const opts = { manufacturer: '_TZ3000_vsxvaj9i', batteryType: 'CR2032', treat200AsSentinel: false };
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(200, opts), 100);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255, opts), null);
  assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(null, opts), null);
  assert.notStrictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255, opts), 100);
});

test('ensureTuyaCluster arms passive listen before reporting a missing EF00 cluster', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../lib/io/DeviceIOFacade.js'), 'utf8');
  const miss = src.indexOf('ensureTuyaCluster: 0xEF00 not interviewed');
  const window = src.slice(Math.max(0, miss - 500), miss);
  assert.match(window, /_enablePassiveTuyaListen\(opts\)/);
  assert.strictEqual(src.includes('ensureTuyaCluster skipped (sleepy scene remote'), false);
});
