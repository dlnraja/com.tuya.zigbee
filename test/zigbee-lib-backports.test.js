'use strict';
// Local backports of zigbee-clusters 3.x (Time cluster attributes) and homey-zigbeedriver 2.2.18
// (finite transition durations, dim read-back race) while the app stays on 2.6.0 / 2.2.17 for
// Homey firmware >= 12.2.0 (Node 16/18). Runs in a child process: no lib module is loaded here.
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const bp = require('./lib/zigbee/ZigbeeLibBackports');
const out = { state: bp.apply(), again: bp.apply() };
const { Cluster } = require('zigbee-clusters');
const T = Cluster.getCluster(10);
out.timeName = T.NAME;
out.timeAttrs = Object.fromEntries(Object.entries(T.ATTRIBUTES).map(([k, v]) => [k, [v.id, v.type.id]]));
const buf = Buffer.alloc(4); T.ATTRIBUTES.time.type.toBuffer(buf, 812345678, 0);
out.utcRoundTrip = T.ATTRIBUTES.time.type.fromBuffer(buf, 0);
out.utcNow2000 = bp.zigbeeUtcNow(Date.UTC(2000, 0, 1, 0, 1, 0));
const U = require('homey-zigbeedriver').Util;
const L = require('./lib/util');
out.dur = [U.calculateLevelControlTransitionTime({ duration: NaN }), U.calculateLevelControlTransitionTime({ duration: Infinity }),
  U.calculateLevelControlTransitionTime({ duration: 500 }), U.calculateColorControlTransitionTime({ duration: NaN }),
  L.calculateLevelControlTransitionTime({ duration: NaN }), L.calculateColorControlTransitionTime({ duration: Infinity }),
  L.calculateLevelControlTransitionTime({ duration: 1200 })];
const now = () => Date.now();
async function scenario(dimOffsetMs, onoff) {
  const ctx = { set: [], setCapabilityValue: async (c, v) => { ctx.set.push([c, v]); }, error: () => {} };
  let release; const gate = new Promise((r) => { release = r; });
  if (dimOffsetMs !== null && dimOffsetMs < 0) ctx._dimCommandAt = now() + dimOffsetMs;
  await bp.onOffWithDimReadback(ctx, onoff, async () => 'ok', { readAttributes: async () => ({ currentLevel: 127 }) }, () => gate);
  if (dimOffsetMs !== null && dimOffsetMs >= 0) ctx._dimCommandAt = now() + dimOffsetMs;
  release(); await new Promise((r) => setTimeout(r, 20));
  return ctx.set;
}
(async () => {
  out.noDim = await scenario(null, true);
  out.dimAfter = await scenario(0, true);
  out.dimJustBefore = await scenario(-200, true);
  out.dimLongBefore = await scenario(-5000, true);
  out.off = await scenario(null, false);
  const { ZigBeeLightDevice } = require('homey-zigbeedriver');
  const dev = Object.create(ZigBeeLightDevice.prototype);
  const sent = [];
  dev.log = () => {}; dev.debug = () => {}; dev.error = () => {};
  dev.getCapabilityValue = () => true; dev.setCapabilityValue = async () => {};
  Object.defineProperty(dev, 'levelControlCluster', { value: { moveToLevelWithOnOff: async (c) => { sent.push(c); } } });
  await dev.changeDimLevel(0.5, { duration: NaN });
  out.lightDim = { sent, dimAt: typeof dev._dimCommandAt === 'number' && dev._dimCommandAt > 0 };
  console.log(JSON.stringify(out));
})().catch((e) => { console.error(e.stack); process.exit(1); });
`;

describe('zigbee library backports (zigbee-clusters 3.x, homey-zigbeedriver 2.2.18)', function () {
  this.timeout(60000);
  let out;
  before(() => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    out = JSON.parse(r.stdout.trim().split('\n').pop());
  });
  it('applies once while the installed libraries are older than the fixes', () => {
    assert.deepStrictEqual(out.state, { applied: true, time: true, durations: true, lightDevice: true });
    assert.deepStrictEqual(out.again, out.state);
  });
  it('Time cluster 0x000A declares the ten ZCL attributes with distinct ids (validUntilTime = 9)', () => {
    assert.strictEqual(out.timeName, 'time');
    const ids = Object.values(out.timeAttrs).map(([id]) => id);
    assert.strictEqual(new Set(ids).size, ids.length);
    assert.deepStrictEqual(out.timeAttrs.time, [0, 0xE2]);
    assert.deepStrictEqual(out.timeAttrs.validUntilTime, [9, 0xE2]);
    assert.deepStrictEqual(out.timeAttrs.lastSetTime, [8, 0xE2]);
    assert.strictEqual(out.timeAttrs.localTime[0], 7);
    assert.strictEqual(out.utcRoundTrip, 812345678);
    assert.strictEqual(out.utcNow2000, 60);
  });
  it('NaN / Infinity durations fall back to the device default; finite ones still convert', () => {
    assert.deepStrictEqual(out.dur, [0xFFFF, 0xFFFF, 5, 0, 0xFFFF, 0, 12]);
  });
  it('dim read-back after "on" is dropped when a dim command belongs to the same action', () => {
    assert.deepStrictEqual(out.noDim, [['dim', 0.5]]);
    assert.deepStrictEqual(out.dimAfter, []);
    assert.deepStrictEqual(out.dimJustBefore, []);
    assert.deepStrictEqual(out.dimLongBefore, [['dim', 0.5]]);
    assert.deepStrictEqual(out.off, [['dim', 0]]);
  });
  it('ZigBeeLightDevice.changeDimLevel records the dim time and ignores a NaN duration', () => {
    assert.strictEqual(out.lightDim.dimAt, true);
    assert.deepStrictEqual(out.lightDim.sent, [{ level: 127, transitionTime: 0xFFFF }]);
  });
});
