'use strict';

/**
 * P2621 — Contre quoi: dedicated WiFi heat_pump / kettle / EV + Fix-It must stay.
 * MASTER_ONLY feature lock (anti-régression).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2621 wifi heat_pump / kettle / EV + Fix-It', () => {
  const IDS = ['wifi_heat_pump', 'wifi_kettle', 'wifi_ev_charger'];

  for (const id of IDS) {
    it(`${id} has compose + device + driver + assets + pair`, () => {
      const base = path.join(ROOT, 'drivers', id);
      assert.ok(fs.existsSync(path.join(base, 'driver.compose.json')));
      assert.ok(fs.existsSync(path.join(base, 'device.js')));
      assert.ok(fs.existsSync(path.join(base, 'driver.js')));
      assert.ok(fs.existsSync(path.join(base, 'pair', 'configure.html')));
      assert.ok(fs.existsSync(path.join(base, 'assets', 'icon.svg')));
      assert.ok(fs.existsSync(path.join(base, 'assets', 'images', 'small.png')));
      assert.ok(fs.existsSync(path.join(base, 'assets', 'images', 'large.png')));
      const compose = readJson(`drivers/${id}/driver.compose.json`);
      assert.equal(compose.id, id);
      assert.ok(Array.isArray(compose.capabilities) && compose.capabilities.includes('onoff'));
      assert.ok(compose.connectivity && compose.connectivity.includes('lan'));
      assert.ok(!compose.zigbee, 'WiFi drivers must not declare empty zigbee {}');
      const settingsIds = (compose.settings || [])
        .flatMap((g) => (g.children || []).map((c) => c.id));
      assert.ok(settingsIds.includes('offline_grace_seconds'), 'P2619 LAN reliability settings');
      assert.ok(settingsIds.includes('command_gap_ms'));
    });
  }

  it('heat_pump / kettle / EV device.js expose dpMappings', () => {
    for (const id of IDS) {
      const src = fs.readFileSync(path.join(ROOT, 'drivers', id, 'device.js'), 'utf8');
      assert.ok(src.includes('get dpMappings'), id);
      assert.ok(src.includes('TuyaLocalDevice'), id);
    }
  });

  it('drivers declare expected Tuya categories', () => {
    const heat = fs.readFileSync(path.join(ROOT, 'drivers/wifi_heat_pump/driver.js'), 'utf8');
    const kettle = fs.readFileSync(path.join(ROOT, 'drivers/wifi_kettle/driver.js'), 'utf8');
    const ev = fs.readFileSync(path.join(ROOT, 'drivers/wifi_ev_charger/driver.js'), 'utf8');
    assert.ok(heat.includes('getExpectedTuyaCategories') && heat.includes("'rs'"));
    assert.ok(kettle.includes("'bh'"));
    assert.ok(ev.includes("'qccdz'"));
  });

  it('TuyaLocalDriver filters by expected category', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
    assert.ok(src.includes('_filterByExpectedCategory'));
    assert.ok(src.includes('getExpectedTuyaCategories'));
  });

  it('WiFiDPRegistry keeps rs/bh/qccdz + EV product UNION', () => {
    const reg = require('../../lib/tuya-local/WiFiDPRegistry');
    assert.ok(reg.CATEGORY_DP_HINTS.rs);
    assert.ok(reg.CATEGORY_DP_HINTS.bh);
    assert.ok(reg.CATEGORY_DP_HINTS.qccdz);
    assert.ok(reg.PRODUCT_DP_HINTS.evcharger11kw);
    assert.ok(reg.PRODUCT_DP_HINTS.wallbox11kw);
  });

  it('classifyDeviceType returns Heat Pump / Smart Kettle / EV Charger', () => {
    const TuyaDeviceDiscovery = require('../../lib/tuya-local/TuyaDeviceDiscovery');
    assert.equal(TuyaDeviceDiscovery.classifyDeviceType('rs', '', ''), 'Heat Pump');
    assert.equal(TuyaDeviceDiscovery.classifyDeviceType('bh', '', ''), 'Smart Kettle');
    assert.equal(TuyaDeviceDiscovery.classifyDeviceType('qccdz', '', ''), 'EV Charger');
  });

  it('WifiFixIt redacts keys and builds bundle', () => {
    const FixIt = require('../../lib/wifi/WifiFixIt');
    assert.ok(FixIt.redactKey('abcdefghijklmnop').includes('…'));
    assert.ok(!FixIt.redactKey('abcdefghijklmnop').includes('abcdefghijklmnop'));
    const findings = FixIt.checkLocalKeys([
      { id: '1', name: 'A', has_local_key: false },
      { id: '2', name: 'B', has_local_key: true, available: true, local_key_preview: 'ab…yz' },
    ]);
    assert.ok(findings.some((f) => f.severity === 'error' && f.check === 'local_key'));
    const bundle = FixIt.buildSupportBundle({ drivers: { getDrivers: () => ({}) } }, []);
    assert.equal(bundle.appId, 'com.dlnraja.tuya.zigbee');
    assert.ok(bundle.note.toLowerCase().includes('redact'));
  });

  it('settings + api expose Fix-It', () => {
    const html = fs.readFileSync(path.join(ROOT, 'settings/index.html'), 'utf8');
    assert.ok(html.includes('wifi-fixit-card'));
    assert.ok(html.includes('/wifi-fix-it'));
    const api = fs.readFileSync(path.join(ROOT, 'api.js'), 'utf8');
    assert.ok(api.includes('getWifiFixIt'));
    const compose = readJson('.homeycompose/app.json');
    assert.ok(compose.api.getWifiFixIt);
    assert.equal(compose.api.getWifiFixIt.path, '/wifi-fix-it');
  });

  it('dual-app tracks classify P2621 as MASTER_ONLY', () => {
    const tracks = readJson('config/architecture/dual-app-tracks.json');
    assert.equal(tracks.domains.p2621_wifi_heat_pump_ev_kettle_fixit.tag, 'MASTER_ONLY');
  });
});
