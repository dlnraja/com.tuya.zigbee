'use strict';

/**
 * P3080 batch F — the 4 localtuya opt-in keys (reset_dpids, restore_on_reconnect, manual_dps,
 * passive_start; ideas from rospogrigio/localtuya + xZetsubou/hass-localtuya, own code) are declared
 * once in the shared settings template `.homeycompose/drivers/settings/localtuya_advanced.json`
 * (an advanced group, everything off by default) and pulled by `$extends` into every Wi-Fi driver
 * built on TuyaLocalDevice. Upload cost is paid back by shorter canonical publish hints.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const KEYS = ['reset_dpids', 'restore_on_reconnect', 'manual_dps', 'passive_start'];
const OFF = { reset_dpids: '', restore_on_reconnect: false, manual_dps: '', passive_start: false };
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const tpl = readJson('.homeycompose/drivers/settings/localtuya_advanced.json');

function tuyaLocalWifiDrivers() {
  return fs.readdirSync(path.join(ROOT, 'drivers')).filter((id) => {
    if (!id.startsWith('wifi_')) {return false;}
    const f = path.join(ROOT, 'drivers', id, 'device.js');
    return fs.existsSync(f) && /\bTuyaLocalDevice\)*\s*\{/.test(fs.readFileSync(f, 'utf8'));
  });
}

describe('P3080 localtuya options declared through a shared template', () => {
  it('template is one advanced group with the 4 keys, all off by default', () => {
    assert.equal(tpl.type, 'group');
    assert.match(tpl.label.en, /Advanced/);
    assert.deepEqual(tpl.children.map((c) => c.id), KEYS);
    for (const c of tpl.children) {assert.equal(c.value, OFF[c.id], c.id);}
    for (const l of [tpl.label, ...tpl.children.map((c) => c.label)]) {
      assert.deepEqual(Object.keys(l), ['en', 'fr', 'de', 'nl'], l.en);
      for (const k of ['fr', 'de', 'nl']) {assert.notEqual(l[k], l.en, `${l.en} ${k}`);}
    }
  });

  it('every TuyaLocalDevice Wi-Fi driver extends it (compose + app.json); others do not', () => {
    const ids = tuyaLocalWifiDrivers();
    assert.ok(ids.length >= 30, `only ${ids.length}`);
    const app = readJson('app.json');
    for (const id of ids) {
      const c = readJson(`drivers/${id}/driver.compose.json`);
      assert.ok(c.settings.some((s) => [].concat(s.$extends || []).includes('localtuya_advanced')), id);
      const g = app.drivers.find((d) => d.id === id).settings.find((s) => s.id === 'localtuya_advanced');
      assert.ok(g, `app.json ${id}`);
      assert.deepEqual(g.children, tpl.children, id);
    }
    for (const d of app.drivers) {
      if (ids.includes(d.id)) {continue;}
      assert.ok(!JSON.stringify(d.settings || []).includes('"localtuya_advanced"'), d.id);
    }
  });

  it('canonical publish hints that pay for it are shorter and keep their source text', () => {
    const { settingHints } = readJson('scripts/maintenance/shared-text-canon.json');
    for (const id of ['command_gap_ms', 'offline_grace_seconds', 'suppress_release_after_click', 'zcl_cluster_layer',
      'adaptive_brightness', 'tuya_time_sync', 'device_type', 'invert_logic_manual', 'button_mode']) {
      const c = settingHints[id];
      assert.ok(c && c.to.en.length < c.from.length && c.to.fr, id);
      assert.deepEqual(Object.keys(c.to), ['en', 'fr'], id);
    }
  });

  it('reset_dpids applies live from onSettings; other keys need no reconnect', async () => {
    const devPath = require.resolve('../../lib/tuya-local/TuyaLocalDevice');
    const prev = require.cache[devPath];
    delete require.cache[devPath];
    const orig = Module._load;
    Module._load = function (req, ...rest) {
      return req === 'homey' ? { Device: class {}, Driver: class {}, App: class {} } : orig.call(this, req, ...rest);
    };
    let T;
    try { T = require(devPath); } finally {
      Module._load = orig;
      if (prev) {require.cache[devPath] = prev;} else {delete require.cache[devPath];}
    }
    const got = [];
    let destroyed = 0;
    const d = {
      _client: { setResetDpids: (v) => got.push(v) },
      _destroyDevice: () => { destroyed++; }, log() {}, error() {},
      getSetting: () => undefined, getStoreValue: () => undefined, setStoreValue: async () => {},
    };
    await T.prototype.onSettings.call(d, {
      oldSettings: {}, newSettings: { reset_dpids: '1,18', passive_start: true },
      changedKeys: ['reset_dpids', 'passive_start', 'restore_on_reconnect', 'manual_dps'],
    });
    assert.deepEqual(got, ['1,18']);
    assert.equal(destroyed, 0);
  });
});
