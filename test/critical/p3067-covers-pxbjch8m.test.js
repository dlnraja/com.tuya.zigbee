'use strict';
// P3067 covers (2026-10-26): _TZE204_pxbjch8m = Z2M TS0601_cover_with_1_switch_limited
// (tuya.ts, Koen Kanters and contributors; facts only): DP1 open/stop/close, DP7 relay l1.
// Exact couple on panel_switch_cover_tuya with its own profile; the 2+2 panel profile is unchanged.
// Runs in a child process so no lib module is loaded into the shared mocha process.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const Dev = require('./drivers/panel_switch_cover_tuya/device.js');
const compose = require('./drivers/panel_switch_cover_tuya/driver.compose.json');
const d = Object.create(Dev.prototype);
const p = d.profileFor('_tze204_pxbjch8m');
const old = d.profileFor('_tze200_rgeapp2c');
const values = {};
d._dpProfileCache = p;
d.hasCapability = (c) => p.capabilities.includes(c);
d.safeSetCapabilityValue = (c, v) => { values[c] = v; };
d.log = () => {};
d._onProfileDP(7, true);
d._onProfileDP(1, 2);
console.log(JSON.stringify({ caps: p.capabilities, dps: Object.keys(p.dps), oldCaps: old.capabilities.length,
  oldDps: Object.keys(old.dps), values, mfrs: compose.zigbee.manufacturerName, pids: compose.zigbee.productId }));
`;

describe('P3067 covers — _TZE204_pxbjch8m cover switch with one relay', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');

  it('gets its own exact profile (DP1 cover state, DP7 relay) and no position capability', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    assert.deepStrictEqual(out.caps, ['windowcoverings_state', 'onoff']);
    assert.deepStrictEqual(out.dps, ['1', '7']);
    assert.strictEqual(out.values.onoff, true);
    assert.strictEqual(out.values.windowcoverings_state, 'down');
  });

  it('leaves the 2+2 panel profile unchanged and lists the exact couple in both cases', () => {
    assert.strictEqual(out.oldCaps, 8);
    assert.deepStrictEqual(out.oldDps, ['1', '2', '4', '5', '101', '102']);
    assert.ok(out.mfrs.includes('_TZE204_pxbjch8m') && out.mfrs.includes('_tze204_pxbjch8m'));
    assert.deepStrictEqual(out.pids, ['TS0601']);
  });
});
