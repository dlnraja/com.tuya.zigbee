'use strict';

/**
 * P2490 — Contre quoi (T140352 VicHY / Eduard / MIAMO / Peter / PresentSky):
 * Root gap: Athom compact drops `_TZE200_icka1clh` (MIAMO Unknown) while
 * `_TZE284_fodv6bkr` is kept — complementary keep-locks + battery rehydrate +
 * curtain stale strip must ship together.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');

describe('P2490 complementary failover (icka1clh / battery / curtain stale)', () => {
  const keep = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
    'utf8',
  ));
  const couples = keep.couples || [];

  function hasKeep(mfr, pid, driverId) {
    return couples.some((c) => (
      String(c.mfr).toLowerCase() === String(mfr).toLowerCase()
      && String(c.pid || c.productId) === pid
      && c.driverId === driverId
    ));
  }

  it('sacred-keep pins both icka1clh and fodv6bkr families (asymmetric drop Contre quoi)', () => {
    assert.ok(hasKeep('_TZE200_icka1clh', 'TS0601', 'curtain_motor'));
    assert.ok(hasKeep('_TZE204_icka1clh', 'TS0601', 'curtain_motor'));
    assert.ok(hasKeep('_TZE284_fodv6bkr', 'TS0601', 'curtain_motor'));
    assert.ok(hasKeep('_TZE200_fodv6bkr', 'TS0601', 'curtain_motor'));
    assert.ok(hasKeep('_TZE200_zah67ekd', 'TS0601', 'curtain_motor'));
    assert.ok(hasKeep('_TZ3000_mrpevh8p', 'TS0041', 'button_wireless_1'));
    assert.ok(hasKeep('_TZE204_clrdrnya', 'TS0601', 'presence_sensor_radar'));
  });

  it('compactManifestFile keeps icka1clh + fodv6bkr after budget cut', () => {
    const { compactManifestFile } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
    const tmp = path.join(os.tmpdir(), `p2490-compact-${process.pid}.json`);
    fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
    compactManifestFile(tmp, {
      maxTotalCombos: 17000,
      maxDriverCombos: 2000,
      maxCaseForms: 2,
    });
    const after = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }

    const curtain = (after.drivers || []).find((d) => d.id === 'curtain_motor');
    assert.ok(curtain, 'curtain_motor in compacted manifest');
    const mfrs = (curtain.zigbee && curtain.zigbee.manufacturerName) || [];
    assert.ok(mfrs.some((m) => /_TZE200_icka1clh/i.test(m)), 'compact keeps _TZE200_icka1clh');
    assert.ok(mfrs.some((m) => /_TZE204_icka1clh/i.test(m)), 'compact keeps _TZE204_icka1clh');
    assert.ok(mfrs.some((m) => /_TZE284_fodv6bkr/i.test(m)), 'compact keeps _TZE284_fodv6bkr');
  });

  it('Peter battery rehydrate on button boot + adapter keep-lock', () => {
    const btnSrc = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/device.js'), 'utf8');
    assert.match(btnSrc, /P2490 rehydrate measure_battery/);
    assert.match(btnSrc, /addCapability\('measure_battery'\)/);

    const adapterSrc = fs.readFileSync(
      path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'),
      'utf8',
    );
    assert.match(adapterSrc, /P2490 keep-lock/);
    assert.match(adapterSrc, /Queue rehydrate measure_battery/);
  });

  it('VicHY radar staleCaps strips curtain phantoms', () => {
    const radarSrc = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'),
      'utf8',
    );
    assert.match(radarSrc, /windowcoverings_set/);
    assert.match(radarSrc, /staleCaps[\s\S]*windowcoverings_set/);
    assert.match(radarSrc, /staleCaps[\s\S]*windowcoverings_tilt_set/);
  });

  it('prepare-publish must-pins include complementary P2490 set', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(src, /_TZE200_icka1clh/);
    assert.match(src, /_TZE204_icka1clh/);
    assert.match(src, /_TZE284_fodv6bkr/);
    assert.match(src, /_TZE200_fodv6bkr/);
    assert.match(src, /_TZ3000_mrpevh8p/);
    assert.match(src, /_TZE204_clrdrnya/);
  });

  it('forum complementary SSOT documents root gap', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/forum-complementary-failover-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot._meta.id, 'P2490-forum-complementary-failover');
    assert.ok(ssot.users.MIAMO_NISU.complementary.some((s) => /sacred-keep|icka1clh|fodv6bkr/i.test(s)));
    assert.ok(ssot.users.Peter_van_Werkhoven.complementary.some((s) => /rehydrate/i.test(s)));
    assert.ok(ssot.users.VicHY.complementary.some((s) => /staleCaps|windowcoverings/i.test(s)));
    assert.ok(ssot.sacredKeepPins.some((p) => /icka1clh/.test(p)));
  });
});
