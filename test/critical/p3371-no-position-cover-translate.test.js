'use strict';

/**
 * P3371 - open/stop/close-only covers driven by position targets.
 * Source: Homey forum 146735 #499 / #503 (CAWV, EMTECO Wi-Fi blinds,
 * https://community.homey.app/t/146735/503): Apple Home / Matter only send position
 * targets; on a motor without a position DP nothing moves. Contre quoi: never remove a
 * capability on a paired device - translate the target to open/close and keep the
 * position tile consistent (100 % after an open run, 0 % after a close run).
 * stable-v5: Wi-Fi layer only (no PositionSupportTracker on this branch).
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const NPC = require('../../lib/covers/NoPositionCover');
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const WiFiCoverDevice = require('../../drivers/wifi_cover/device');

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
