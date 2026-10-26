'use strict';
// P3067 family 7 (keypads): Daewoo WKE502Z (_TZE200_rt5dklro, Z2M daewoo.ts). The hub must ACK arm away / arm home
// with DP23 = true, re-send hub mode (DP101) after each start-up report (DP25), map DP25 / DP112, and write the
// keypad options (DP103-111) only when the user changes them, queued until the sleepy keypad reports again.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = `
const Module = require('module');
const P = require('path');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const sent = [];
const ef = require(P.resolve('lib/zigbee/Ef00OnlyInterview.js'));
ef.sendEf00DpMaxFallback = async (dev, dp, v) => { sent.push([dp, v]); return true; };
const D = require(P.resolve('drivers/keypad_alarm_wke502z/device.js'));
const caps = { homealarm_state: 'disarmed', alarm_generic: false, measure_battery: 100, alarm_tamper: false };
const store = {}; const settings = { zb_manufacturer_name: '_TZE200_rt5dklro', wke502z_key_beep: true, wke502z_arm_delay: 30 };
const self = Object.create(D.prototype);
Object.assign(self, {
  log: () => {}, error: () => {},
  hasCapability: (c) => c in caps, getCapabilityValue: (c) => caps[c],
  safeSetCapabilityValue: (c, v) => { caps[c] = v; },
  getSetting: (k) => settings[k], setSettings: async (o) => Object.assign(settings, o),
  getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; },
  getData: () => ({ manufacturerName: '_TZE200_rt5dklro' }),
});
const tick = () => new Promise((r) => setTimeout(r, 5));
(async () => {
  const out = {};
  store.wke502z_hub_mode = true; // legacy persistent flag must no longer suppress DP101 for this session
  self._onProfileDP(3, 90); await tick();
  out.hub1 = sent.filter((s) => s[0] === 101).length;
  self._onProfileDP(27, 1); await tick();
  out.ack = sent.filter((s) => s[0] === 23 && s[1] === true).length; out.state27 = caps.homealarm_state;
  await self.onSettings({ oldSettings: {}, newSettings: settings, changedKeys: ['wke502z_key_beep', 'wke502z_arm_delay'] }); await tick();
  out.opts = sent.filter((s) => s[0] === 104 || s[0] === 103).map((s) => s.join(':')).sort();
  sent.length = 0;
  self._onProfileDP(25, 2); await tick(); await tick();
  out.after25 = sent.map((s) => s[0]).sort((a, b) => a - b); out.state25 = caps.homealarm_state;
  self._onProfileDP(112, 4); await tick();
  out.user = String(settings.wke502z_last_user || '').startsWith('4 ');
  console.log(JSON.stringify(out));
})();
`;

describe('P3067 keypad WKE502Z (rt5dklro): ACK, hub-mode re-arm, options', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');

  it('re-sends hub mode once per session even with the legacy store flag', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(out.hub1, 1);
  });
  it('ACKs arm away with DP23 = true', () => {
    assert.strictEqual(out.ack, 1);
    assert.strictEqual(out.state27, 'armed');
  });
  it('writes changed options only, with their DPs', () => {
    assert.deepStrictEqual(out.opts, ['103:30', '104:true']);
  });
  it('after the start-up report (DP25) re-sends hub mode and only the volatile option the user set', () => {
    assert.deepStrictEqual(out.after25, [101, 104]);
    assert.strictEqual(out.state25, 'armed');
  });
  it('shows the last user id (DP112)', () => { assert.strictEqual(out.user, true); });
  it('declares the options as non-blocking settings in compose and app.json', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/keypad_alarm_wke502z/driver.compose.json'), 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'keypad_alarm_wke502z');
    for (const s of [JSON.stringify(c.settings), JSON.stringify(d.settings)]) {
      for (const id of ['wke502z_arm_delay', 'wke502z_key_beep', 'wke502z_quick_sos', 'wke502z_last_user']) { assert.ok(s.includes(id), id); }
    }
  });
});
