'use strict';

/**
 * P3050 (t558u) — merging PR #577 must not lose anything the fingerbot driver had before it.
 * Baseline = master ca08984b70 (just before the PR), frozen in test/fixtures so the check also
 * runs on shallow CI clones. Every capability, setting, flow card, manufacturer/product id and
 * device method of the baseline must still exist; the sendData route is ADDED in front of the
 * inherited cascade, the settings replay is deferred (not removed), genPowerCfg stays optional.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRV = path.join(ROOT, 'drivers', 'fingerbot');
const base = require('../fixtures/p3050-fingerbot-baseline.json');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const missing = (before, now) => before.filter((x) => !now.includes(x));

const compose = readJson(path.join(DRV, 'driver.compose.json'));
const flow = readJson(path.join(DRV, 'driver.flow.compose.json'));
const settingsFile = path.join(DRV, 'driver.settings.compose.json');
const settings = fs.existsSync(settingsFile) ? readJson(settingsFile) : (compose.settings || []);
const src = fs.readFileSync(path.join(DRV, 'device.js'), 'utf8');

test('P3050: no capability removed', () => {
  assert.deepStrictEqual(missing(base.capabilities, compose.capabilities || []), []);
});

test('P3050: no setting removed', () => {
  const keys = [];
  (function walk(a) { for (const x of a || []) { if (x.id) keys.push(x.id); if (x.children) walk(x.children); } })(settings);
  assert.deepStrictEqual(missing(base.settings, keys), []);
});

test('P3050: no flow card removed', () => {
  for (const t of ['triggers', 'conditions', 'actions']) {
    const now = (flow[t] || []).map((x) => x.id);
    assert.deepStrictEqual(missing(base.flow[t], now), [], t);
  }
});

test('P3050: no couple removed (manufacturerName + productId)', () => {
  const zb = compose.zigbee || {};
  assert.deepStrictEqual(missing(base.manufacturerName, zb.manufacturerName || []), []);
  assert.deepStrictEqual(missing(base.productId, zb.productId || []), []);
});

test('P3050: no device method removed (settings replay, handlers, DP paths)', () => {
  const now = [...src.matchAll(/^\s+(?:async\s+)?([_a-zA-Z0-9]+)\s*\([^)]*\)\s*\{/gm)].map((m) => m[1]);
  assert.deepStrictEqual(missing(base.deviceMethods, now), []);
  assert.ok(now.includes('applyConfiguredSettings'), 'settings replay must stay (deferred, not removed)');
});

test('P3050: inherited cascade kept as fallback, genPowerCfg kept optional', () => {
  assert.match(src, /super\._sendTuyaDatapoint\(/, 'inherited io.sendDP cascade must remain reachable');
  assert.match(src, /powerConfiguration/, 'optional genPowerCfg battery reporting must remain');
  assert.match(src, /_scheduleSettingsReplay\(\)/, 'replay is deferred via _scheduleSettingsReplay');
});
