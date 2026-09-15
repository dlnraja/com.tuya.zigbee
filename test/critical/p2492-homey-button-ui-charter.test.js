'use strict';

/**
 * P2492 — Homey button UI charter Contre quoi
 * Physical ↔ virtual representations: switch=onoff primary, scene=button device view,
 * no invent onoff on remotes, shared virtual UI path.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const {
  resolveUiRole,
  titleFor,
  applyHomeyButtonUiCharter,
  syncPhysicalToHomeyUi,
  handleVirtualUiPress,
  gangOnOffCap,
} = require('../../lib/utils/HomeyButtonUiCharter');

describe('P2492 Homey button UI charter SSOT', () => {
  it('ssot + lib exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/homey-button-ui-charter-ssot.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/utils/HomeyButtonUiCharter.js')));
  });

  it('P2505 TITAN: SSOT load uses Buffer not utf8 string parse', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/utils/HomeyButtonUiCharter.js'), 'utf8');
    assert.ok(/JSON\.parse\(\s*fs\.readFileSync\(\s*SSOT_PATH\s*\)\s*\)/.test(src), 'Buffer JSON.parse required');
    assert.ok(!/JSON\.parse\(\s*fs\.readFileSync\(\s*SSOT_PATH\s*,\s*['\"]utf8['\"]\s*\)\s*\)/.test(src));
  });

  it('roles: switch vs scene vs knob', () => {
    assert.strictEqual(resolveUiRole({ driver: { id: 'switch_2gang', manifest: { class: 'socket' } } }), 'switch');
    assert.strictEqual(resolveUiRole({ driver: { id: 'button_wireless_1', manifest: { class: 'button' } } }), 'scene');
    assert.strictEqual(resolveUiRole({ driver: { id: 'scene_switch_4', manifest: { class: 'button' } } }), 'scene');
    assert.strictEqual(resolveUiRole({ driver: { id: 'smart_knob', manifest: { class: 'button' } } }), 'knob');
  });

  it('titles fill Channel/Button n', () => {
    assert.strictEqual(titleFor('channel', 2).en, 'Channel 2');
    assert.strictEqual(titleFor('button', 3).fr, 'Bouton 3');
  });
});

describe('P2492 apply charter', () => {
  it('scene remotes: button.N not maintenanceAction (device view)', async () => {
    const opts = {};
    const caps = ['button.1', 'button.2', 'measure_battery'];
    const d = {
      driver: { id: 'scene_switch_4', manifest: { class: 'button' } },
      hasCapability: (c) => caps.includes(c),
      getCapabilities: () => caps,
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
      log: () => {},
    };
    const r = await applyHomeyButtonUiCharter(d);
    assert.strictEqual(r.role, 'scene');
    assert.strictEqual(opts['button.1'].maintenanceAction, false);
    assert.strictEqual(opts['button.2'].maintenanceAction, false);
    assert.ok(opts['button.1'].title.en.includes('Button'));
  });

  it('switches: button.N stay maintenance; onoff titled Channel', async () => {
    const opts = {};
    const caps = ['onoff', 'onoff.gang2', 'button.1', 'button.2'];
    const d = {
      driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
      hasCapability: (c) => caps.includes(c),
      getCapabilities: () => caps,
      setCapabilityOptions: async (c, o) => { opts[c] = o; },
      log: () => {},
    };
    const r = await applyHomeyButtonUiCharter(d);
    assert.strictEqual(r.role, 'switch');
    assert.strictEqual(opts['button.1'].maintenanceAction, true);
    assert.strictEqual(opts.onoff.title.en, 'Channel 1');
    assert.strictEqual(opts['onoff.gang2'].title.en, 'Channel 2');
  });
});

describe('P2492 bidirectional sync', () => {
  it('physical sync updates onoff on switches', async () => {
    const sets = [];
    const caps = new Set(['onoff', 'onoff.gang2', 'button.1']);
    const d = {
      driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
      hasCapability: (c) => caps.has(c),
      getCapabilities: () => [...caps],
      safeSetCapabilityValue: async (c, v) => { sets.push([c, v]); },
      log: () => {},
    };
    const r = await syncPhysicalToHomeyUi(d, 2, { source: 'physical', value: true });
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.role, 'switch');
    assert.ok(sets.some(([c, v]) => c === 'onoff.gang2' && v === true));
  });

  it('virtual UI prefers mixin path and stamps dedup', async () => {
    const toggles = [];
    const d = {
      driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
      hasCapability: (c) => c === 'onoff' || c === 'button.1',
      getCapabilities: () => ['onoff', 'button.1'],
      getCapabilityValue: () => false,
      _handleVirtualToggle: async (g) => { toggles.push(g); },
      triggerButtonPress: async () => {},
      log: () => {},
    };
    const r = await handleVirtualUiPress(d, 1);
    assert.strictEqual(r.path, 'virtual-mixin');
    assert.deepStrictEqual(toggles, [1]);
    assert.ok(d._virtualPhysicalDedup.lastVirtualPress[1] > 0);
  });

  it('virtual UI drops inside physical window', async () => {
    const d = {
      driver: { id: 'switch_2gang', manifest: { class: 'socket' } },
      hasCapability: () => true,
      _handleVirtualToggle: async () => { throw new Error('should not run'); },
      _virtualPhysicalDedup: {
        lastVirtualPress: {},
        lastPhysicalPress: { 1: Date.now() },
        dedupWindow: 2000,
      },
      log: () => {},
    };
    const r = await handleVirtualUiPress(d, 1);
    assert.strictEqual(r.path, 'dropped');
  });

  it('gangOnOffCap resolves gang2', () => {
    const d = {
      hasCapability: (c) => c === 'onoff.gang2',
    };
    assert.strictEqual(gangOnOffCap(d, 2), 'onoff.gang2');
  });
});

describe('P2492 wiring', () => {
  it('TuyaZigbeeDevice + PhysicalButtonMixin + ensureGangUi reference P2492 charter', () => {
    const tz = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    const pb = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const eg = fs.readFileSync(path.join(ROOT, 'lib/utils/ensureGangUiCapabilities.js'), 'utf8');
    assert.ok(/HomeyButtonUiCharter|handleVirtualUiPress|P2492/.test(tz));
    assert.ok(/syncPhysicalToHomeyUi|P2492/.test(pb));
    assert.ok(/applyHomeyButtonUiCharter|P2492/.test(eg));
  });
});
