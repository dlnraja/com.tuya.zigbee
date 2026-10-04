'use strict';
// #95: TuyaDpProfileDevice `mirrors` keep an exact standard capability (read by the Matter Bridge,
// Alexa and Google) in sync with a sub-capability, both ways, without removing the source.
// Runs in a child process so no lib module is loaded into the shared mocha process.
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
const Dev = require('./drivers/panel_switch_cover_tuya/device.js');
const compose = require('./drivers/panel_switch_cover_tuya/driver.compose.json');
const d = Object.create(Dev.prototype);
const values = {}; const listeners = {}; const sent = [];
const profile = d.profileFor('_tze200_x');
d._dpProfileCache = profile;
d.hasCapability = (c) => profile.capabilities.includes(c);
d.safeSetCapabilityValue = (c, v) => { values[c] = v; };
d.registerCapabilityListener = (c, fn) => { listeners[c] = fn; };
d._sendProfileDP = async (dp, def, v) => { sent.push([dp, def.cap, v]); return true; };
d.log = () => {};
(async () => {
  // Same listener-registration loop as onNodeInit, without the Zigbee stack.
  const src = require('./lib/devices/TuyaDpProfileDevice.js').prototype.onNodeInit.toString();
  if (!/profile\\.mirrors/.test(src)) throw new Error('mirror registration missing');
  for (const [dp, def] of Object.entries(profile.dps)) {
    listeners[def.cap] = async (v) => { await d._sendProfileDP(Number(dp), def, v); d._syncMirrors(def.cap, v); };
  }
  for (const [main, s] of Object.entries(profile.mirrors)) {
    const [dp, def] = Object.entries(profile.dps).find(([, x]) => x.cap === s);
    listeners[main] = async (v) => { await d._sendProfileDP(Number(dp), def, v); values[s] = v; };
  }
  d._onProfileDP(2, 30);            // device reports shutter 1 at 30 %
  const afterReport = { ...values };
  await listeners.windowcoverings_set(0.8);   // user moves the standard capability
  await listeners['windowcoverings_set.c1'](0.4);
  console.log(JSON.stringify({ afterReport, values, sent, caps: compose.capabilities, opts: Object.keys(compose.capabilitiesOptions) }));
})().catch((e) => { console.error(e.stack); process.exit(1); });
`;

describe('#95 DP-profile standard capability mirrors (panel_switch_cover_tuya)', function () {
  this.timeout(60000);
  let out;
  before(() => {
    const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    out = JSON.parse(r.stdout.trim().split('\n').pop());
  });
  it('keeps every shutter/switch sub-capability and adds the standard ones', () => {
    for (const c of ['windowcoverings_state.c1', 'windowcoverings_set.c1', 'windowcoverings_state.c2',
      'windowcoverings_set.c2', 'onoff', 'onoff.s2', 'windowcoverings_state', 'windowcoverings_set']) {
      assert.ok(out.caps.includes(c), c);
    }
    assert.ok(out.opts.includes('windowcoverings_set'));
  });
  it('a device report on shutter 1 updates the standard capability too', () => {
    assert.strictEqual(out.afterReport['windowcoverings_set.c1'], out.afterReport.windowcoverings_set);
    assert.ok(out.afterReport.windowcoverings_set > 0);
  });
  it('the standard capability drives DP2 (shutter 1) and the sub-capability follows', () => {
    assert.deepStrictEqual(out.sent[0], [2, 'windowcoverings_set.c1', 0.8]);
    assert.strictEqual(out.sent[1][0], 2);
    // The standard capability set to 0.8 copied itself to .c1; then .c1 set to 0.4 copied back.
    assert.strictEqual(out.values['windowcoverings_set.c1'], 0.8);
    assert.strictEqual(out.values.windowcoverings_set, 0.4);
  });
});
