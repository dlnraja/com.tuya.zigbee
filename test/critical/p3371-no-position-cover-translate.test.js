'use strict';

/**
 * P3371 - open/stop/close-only covers driven by position targets.
 * Source: Homey forum 146735 #499 / #503 (CAWV, EMTECO Wi-Fi blinds,
 * https://community.homey.app/t/146735/503): Apple Home / Matter only send position
 * targets; on a motor without a position DP nothing moves. Contre quoi: never remove a
 * capability on a paired device - translate the target to open/close and keep the
 * position tile consistent (100 % after an open run, 0 % after a close run).
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const NPC = require('../../lib/covers/NoPositionCover');
const PST = require('../../lib/covers/PositionSupportTracker');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const WiFiCoverDevice = require('../../drivers/wifi_cover/device');
const UnifiedCoverBase = require('../../lib/devices/UnifiedCoverBase');

function storeDev(proto, { st = {}, caps = ['windowcoverings_set', 'windowcoverings_state'], props = {} } = {}) {
  const d = Object.create(proto);
  const set = [];
  Object.assign(d, {
    st, set, capsSet: new Set(caps),
    getStoreValue: (k) => st[k],
    setStoreValue: async (k, v) => { st[k] = v; },
    hasCapability: (c) => d.capsSet.has(c),
    addCapability: async (c) => { d.capsSet.add(c); },
    removeCapability: async (c) => { d.capsSet.delete(c); },
    getSetting: () => undefined,
    safeSetCapabilityValue: async (c, v) => { set.push([c, v]); },
    log() {}, error() {},
  }, props);
  return d;
}

describe('P3371 NoPositionCover helpers', () => {
  it('maps targets to the nearest end', () => {
    assert.strictEqual(NPC.positionToState(1), 'up');
    assert.strictEqual(NPC.positionToState(0.5), 'up');
    assert.strictEqual(NPC.positionToState(0.49), 'down');
    assert.strictEqual(NPC.positionToState(0), 'down');
    assert.strictEqual(NPC.positionToState('x'), null);
  });
  it('a position report always wins; cloud table without position translates at once', () => {
    assert.strictEqual(NPC.isNoPosition({ positionSeen: true, flag: true, moves: 99 }), false);
    assert.strictEqual(NPC.isNoPosition({ cloudHasPosition: false }), true);
    assert.strictEqual(NPC.isNoPosition({ cloudHasPosition: true, moves: 3, minMoves: 3 }), false);
    assert.strictEqual(NPC.isNoPosition({ cloudHasPosition: true, moves: 10, minMoves: 3 }), true);
    assert.strictEqual(NPC.isNoPosition({ moves: 9 }), false);
    assert.strictEqual(NPC.isNoPosition({ moves: 10 }), true);
  });
  it('reads a cloud DP table', () => {
    assert.strictEqual(NPC.cloudTableHasPosition({ 1: { code: 'control', type: 'enum' } }), false);
    assert.strictEqual(NPC.cloudTableHasPosition({ 1: { code: 'control' }, 2: { code: 'percent_control', type: 'value' } }), true);
    assert.strictEqual(NPC.cloudTableHasPosition({}), null);
  });
});

describe('P3371 PositionSupportTracker never removes a capability', () => {
  it('marks the cover learned after the P2772 threshold and keeps windowcoverings_set', async () => {
    const d = storeDev({}, { caps: ['windowcoverings_set'] });
    const t0 = 1e12;
    for (let i = 0; i < PST.MIN_MOVES + 2; i++) {PST.noteMovement(d, i === 0 ? t0 : t0 + PST.MIN_AGE_MS + i);}
    await new Promise((r) => setImmediate(r));
    assert.ok(d.capsSet.has('windowcoverings_set'), 'capability must stay on a paired device');
    assert.strictEqual(d.st.cover_nopos_learned, true);
    assert.strictEqual(PST.isNoPositionDevice(d), true);
  });
  it('ZCL covers are never flagged', () => {
    const d = storeDev({}, { st: { cover_nopos_moves: 50 }, props: { _zclCoverRegistered: true } });
    assert.strictEqual(PST.isNoPositionDevice(d), false);
  });
});

describe('P3371 Zigbee UnifiedCoverBase translates position targets', () => {
  function zDev(st) {
    const listeners = {};
    const sent = []; const triggered = [];
    const d = storeDev(UnifiedCoverBase.prototype, { st, props: {
      _isPureTuyaDP: true, _zclCoverRegistered: false,
      registerCapabilityListener: (c, fn) => { listeners[c] = fn; },
      triggerCapabilityListener: async (c, v) => { triggered.push([c, v]); },
      _diagnosticCheck: async () => {},
      _coverMotionTrack() {},
      _sendTuyaDP: async (...a) => { sent.push(a); },
    } });
    d._registerCapabilityListeners();
    return { d, listeners, sent, triggered };
  }
  it('learned no-position cover: 70 % -> open via the state path, no DP2 write', async () => {
    const { listeners, sent, triggered } = zDev({ cover_nopos_moves: 12 });
    await listeners.windowcoverings_set(0.7);
    assert.deepStrictEqual(triggered, [['windowcoverings_state', 'up']]);
    assert.strictEqual(sent.length, 0);
  });
  it('cover that reported a position keeps the DP2 write', async () => {
    const { listeners, sent, triggered } = zDev({ cover_nopos_moves: 12, cover_position_seen: true });
    await listeners.windowcoverings_set(0.3);
    assert.strictEqual(triggered.length, 0);
    assert.ok(sent.some((a) => a[0] === 2), 'DP2 written');
  });
  it('position tile follows a finished run (idle after down -> 0)', () => {
    const d = storeDev(UnifiedCoverBase.prototype, { st: { cover_nopos_learned: true }, props: { _isPureTuyaDP: true } });
    d._npcFollowState('down');
    d._npcFollowState('idle');
    assert.deepStrictEqual(d.set, [['windowcoverings_set', 0]]);
  });
});

describe('P3371 wifi_cover translates position targets', () => {
  function wDev(st, props = {}) {
    const d = storeDev(WiFiCoverDevice.prototype, { st, props });
    return d;
  }
  async function withSuperSpy(fn) {
    const calls = [];
    const orig = TuyaLocalDevice.prototype._setDP;
    TuyaLocalDevice.prototype._setDP = async function (dp, v) { calls.push([String(dp), v]); };
    try { await fn(calls); } finally { TuyaLocalDevice.prototype._setDP = orig; }
    return calls;
  }
  it('cloud table without position: 70 % -> DP1 open', async () => {
    const calls = await withSuperSpy(async () => { await wDev({ cloud_has_position_dp: false })._setDP('2', 70); });
    assert.deepStrictEqual(calls, [['1', 'open']]);
  });
  it('learned after 3 open/close reports: 20 % -> DP1 close (learned command set kept)', async () => {
    const calls = await withSuperSpy(async () => {
      const d = wDev({ cover_nopos_moves: 3 }, { _coverCommandSet: null });
      await d._setDP('2', 20);
    });
    assert.deepStrictEqual(calls, [['1', 'close']]);
  });
  it('a motor that reported DP2/DP3 keeps the DP2 write', async () => {
    const calls = await withSuperSpy(async () => { await wDev({ cloud_has_position_dp: false }, { _hasPositionDp: true })._setDP('2', 70); });
    assert.deepStrictEqual(calls, [['2', 70]]);
  });
  it('unknown motor (no table, few moves) keeps the DP2 write', async () => {
    const calls = await withSuperSpy(async () => { await wDev({ cover_nopos_moves: 1 })._setDP('2', 70); });
    assert.deepStrictEqual(calls, [['2', 70]]);
  });
  it('position tile follows a finished open run (bidirectional)', () => {
    const d = wDev({ cloud_has_position_dp: false });
    d._npcOnState('up');
    d._npcOnState('idle');
    assert.deepStrictEqual(d.set, [['windowcoverings_set', 1]]);
    assert.strictEqual(d.st.cover_nopos_moves, 1);
  });
});
