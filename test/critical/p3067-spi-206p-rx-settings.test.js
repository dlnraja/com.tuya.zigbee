'use strict';
// P3067 family 8 (lights): Gledopto GL-SPI-206P (Z2M gledopto.ts) - DP61 colour reports decoded (hue, saturation,
// brightness), DP3 brightness only in white mode, strip set-up DPs 53/101/102/103 as non-blocking settings.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const D = require(require('path').resolve('lib/devices/LedControllerSpiTuyaDevice.js'));
const base = Object.getPrototypeOf(D.prototype);
base._onProfileDP = function () {};
const mk = (mode) => {
  const caps = { light_mode: mode, dim: 0.5 }; const settings = {}; const sent = [];
  const self = Object.create(D.prototype);
  Object.assign(self, {
    hasCapability: () => true, getCapabilityValue: (c) => caps[c],
    safeSetCapabilityValue: async (c, v) => { caps[c] = v; },
    getSetting: (k) => settings[k], setSettings: async (o) => Object.assign(settings, o),
    setStoreValue: async () => {}, getStoreValue: () => null, log() {}, error() {},
  });
  return { self, caps, settings, sent };
};
(async () => {
  const out = {};
  const a = mk('temperature');
  a.self._onProfileDP(61, Buffer.from([0, 1, 1, 0x14, 0, 0, 180, 0x01, 0xf4, 0x01, 0x2c]));
  out.colour = { ...a.caps };
  const b = mk('color'); b.self._onProfileDP(3, 800); out.dimColour = b.caps.dim;
  const c = mk('temperature'); c.self._onProfileDP(3, 800); out.dimWhite = c.caps.dim;
  const d = mk('color'); d.self._onProfileDP(61, Buffer.from([0, 0, 1, 0x14, 0, 0, 180, 0, 0, 0, 10])); out.notColour = d.caps.light_hue;
  const e = mk('color'); e.self._onProfileDP(102, 6); e.self._onProfileDP(53, 300); e.self._onProfileDP(103, true);
  await new Promise((r) => setImmediate(r)); out.settings = e.settings;
  console.log(JSON.stringify(out));
})();
`;

describe('P3067 GL-SPI-206P DP61 RX + strip settings', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');
  it('decodes a DP61 colour report into hue, saturation, dim and colour mode', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    assert.strictEqual(out.colour.light_hue, 0.5);
    assert.strictEqual(out.colour.light_saturation, 0.5);
    assert.strictEqual(out.colour.dim, 0.3);
    assert.strictEqual(out.colour.light_mode, 'color');
    assert.strictEqual(out.notColour, undefined);
  });
  it('applies DP3 brightness in white mode only (Z2M glspi206p_brightness)', () => {
    assert.strictEqual(out.dimColour, 0.5);
    assert.strictEqual(out.dimWhite, 0.8);
  });
  it('mirrors DP102/53/103 reports into the settings page', () => {
    assert.deepStrictEqual(out.settings, { spi_chip_type: '6', spi_pixel_count: 300, spi_do_not_disturb: true });
  });
  it('declares the four strip settings in compose and app.json, no pairing write', () => {
    const ids = (s) => JSON.stringify(s).match(/"id":"spi_[a-z_]+"/g).sort();
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/led_controller_rgb/driver.compose.json'), 'utf8'));
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).drivers.find((x) => x.id === 'led_controller_rgb');
    assert.deepStrictEqual(ids(c.settings), ids(a.settings));
    assert.strictEqual(ids(c.settings).length, 4);
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/LedControllerSpiTuyaDevice.js'), 'utf8');
    const init = src.slice(src.indexOf('async onNodeInit'), src.indexOf('_mode()'));
    assert.ok(!/SPI_SETTINGS|sendEf00DpMaxFallback/.test(init), 'no strip setting written at init/pairing');
  });
});
