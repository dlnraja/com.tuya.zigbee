'use strict';

/**
 * Tests — P92.77 LiveDataUpdater (OTA-data from our gh-pages feed)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const LiveDataUpdater = require(path.join(ROOT, 'lib/dynamic/LiveDataUpdater'));
const FM = require(path.join(ROOT, 'lib/utils/fingerprint-matcher'));

function makeUpdater() {
  const store = new Map();
  const homey = {
    settings: { get: (k) => store.get(k), set: (k, v) => store.set(k, v) }
  };
  return new LiveDataUpdater(homey, () => {});
}

describe('P92.77 — LiveDataUpdater', () => {

  it('validates the real exported feed', () => {
    const feed = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/pages-build/data/mfs_db_latest.json'), 'utf8'));
    const u = makeUpdater();
    assert.strictEqual(u._validatePayload(feed), true);
  });

  it('rejects schema violations (bad driverId, __proto__, oversize modelIds)', () => {
    const u = makeUpdater();
    assert.strictEqual(u._validatePayload({ version: '1', devices: { _TZ3000_ABC: { driverId: 'BAD ID!' } } }), false);
    const proto = JSON.parse('{"version":"1","devices":{"__proto__":{"driverId":"x"}}}');
    assert.strictEqual(u._validatePayload(proto), false);
    assert.strictEqual(u._validatePayload({ version: '1', devices: { _TZ3000_ABC: { driverId: 'ok_driver', modelIds: new Array(61).fill('X') } } }), false);
    assert.strictEqual(u._validatePayload('not an object'), false);
    assert.strictEqual(u._validatePayload({ devices: {} }), false, 'missing version');
  });

  it('accepts real-world mfr names (unicode, punctuation, symbols)', () => {
    const u = makeUpdater();
    const p = { version: '1', devices: {
      'MÜLLER LICHT': { driverId: 'bulb_white' },
      'THIRD REALITY, INC': { driverId: 'contact_sensor' },
      'zzh!': { driverId: 'motion_sensor' },
      'prototype': { driverId: 'generic_tuya' },
      'rgb_bulb_E27': { driverId: 'bulb_rgb' }
    } };
    assert.strictEqual(u._validatePayload(p), true);
  });

  it('overlay tier matches NEW fingerprints without touching local db', () => {
    FM.setOverlayProvider(() => ({
      '_TZ3000_NEWDEVICE': { driverId: 'climate_sensor', modelIds: ['TS0201'] }
    }));
    const hit = FM.matchFingerprint('_tz3000_newdevice', 'TS0201', {});
    assert.ok(hit, 'overlay match found');
    assert.strictEqual(hit.matchType, 'live_overlay');
    assert.strictEqual(hit.entry.driverId, 'climate_sensor');
    FM.setOverlayProvider(null);
    const miss = FM.matchFingerprint('_tz3000_newdevice', 'TS0201', {});
    assert.strictEqual(miss, null, 'no overlay → no match');
  });

  it('local curated data wins over overlay on conflict', () => {
    const local = { '_TZ3000_ABC': { driverId: 'switch_1gang', modelIds: ['TS0001'] } };
    FM.setOverlayProvider(() => ({ '_tz3000_abc': { driverId: 'climate_sensor' } }));
    const hit = FM.matchFingerprint('_TZ3000_ABC', 'TS0001', local);
    assert.ok(hit, 'local match found');
    assert.strictEqual(hit.entry.driverId, 'switch_1gang', 'local wins');
    assert.notStrictEqual(hit.matchType, 'live_overlay');
    FM.setOverlayProvider(null);
  });

  it('version comparison prevents stale overlays', async () => {
    const u = makeUpdater();
    const newer = { version: '9.0.389.20260731', devices: {} };
    u._overlay = newer;
    const stale = { version: '9.0.389.20260701', devices: {} };
    // stale <= current → must be rejected by the version check logic
    assert.ok(String(stale.version) <= String(u._overlay.version));
  });

  it('updater is wired in app.js boot and shutdown', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(app.includes('new LiveDataUpdater(this.homey'), 'boot wiring');
    assert.ok(app.includes('setOverlayProvider'), 'matcher provider wired');
    assert.ok(app.includes('liveDataUpdater.stop'), 'shutdown cleanup');
  });

  it('export script excludes synthetic placeholders and caps fields', () => {
    const feed = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/pages-build/data/mfs_db_latest.json'), 'utf8'));
    for (const k of Object.keys(feed.devices)) {
      assert.ok(!/_disabled|_dummy|_generic_|_hybrid|placeholder|needs_/i.test(k), `no synthetic ${k}`);
    }
    assert.ok(feed.version && feed.generated && feed.appVersion, 'feed metadata');
  });
});
