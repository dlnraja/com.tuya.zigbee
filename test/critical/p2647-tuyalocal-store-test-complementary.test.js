'use strict';

/**
 * P2647 — Homey Store Test com.tuyalocal complementary enrich Contre quoi
 * https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/ (tip 1.0.237)
 * UNION only — never wipe P2619–P2642 landings.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2647 tuyalocal store-test complementary', () => {
  it('SSOT locks tip 1.0.237 + store URL + union mandate', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/tuyalocal-store-test-complementary-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot._meta.tipProbed, '1.0.237');
    assert.ok(ssot._meta.storeTest.includes('com.tuyalocal'));
    assert.equal(ssot.mandate.unionNotReplace, true);
    assert.ok(ssot.p2647ComplementaryFromStoreTest.length >= 4);
  });

  it('OemEnumTokens is case-exact (no silent lower)', () => {
    const { resolveOemEnumToken } = require('../../lib/tuya-local/OemEnumTokens');
    assert.equal(resolveOemEnumToken('Heat', 'Heat,Cool,Auto'), 'Heat');
    assert.equal(resolveOemEnumToken('heat', 'Heat,Cool,Auto'), 'Heat'); // unique soft
    assert.equal(resolveOemEnumToken('HEAT', 'Heat,heat'), null); // ambiguous soft
    assert.equal(resolveOemEnumToken('cold', 'Heat,Cool'), null);
  });

  it('WifiFixIt exposes LAN port probe + limitation notes', () => {
    const FixIt = require('../../lib/wifi/WifiFixIt');
    assert.equal(typeof FixIt.probeLanPorts, 'function');
    assert.equal(typeof FixIt.checkLanPorts, 'function');
    assert.ok(FixIt.LAN_LIMITATION_NOTES.some((n) => /deep sleep|Matter|gateway/i.test(n)));
    const bundle = FixIt.buildSupportBundle({ drivers: { getDrivers: () => ({}) } }, []);
    assert.ok(bundle.inspiredBy?.storeTest?.includes('tuyalocal'));
    assert.equal(bundle.inspiredBy.tip, '1.0.237');
  });

  it('wifi_air_quality level + pm03 flows + helpers', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wifi_air_quality/driver.flow.compose.json'),
      'utf8',
    ));
    const ids = (flow.triggers || []).map((t) => t.id);
    assert.ok(ids.includes('wifi_air_quality_level_changed'));
    assert.ok(ids.includes('wifi_air_quality_pm03_above'));
    const deviceSrc = fs.readFileSync(path.join(ROOT, 'drivers/wifi_air_quality/device.js'), 'utf8');
    assert.ok(deviceSrc.includes('AirQualityVerdict'));
    assert.ok(deviceSrc.includes('wifi_air_quality_level_changed'));
    const {
      computeAirQualityLevel,
      crossedAbove,
    } = require('../../lib/tuya-local/AirQualityVerdict');
    assert.equal(computeAirQualityLevel(400, 10), 'good');
    assert.equal(computeAirQualityLevel(1100, 10), 'moderate');
    assert.equal(computeAirQualityLevel(1600, 10), 'poor');
    assert.equal(crossedAbove(900, 1100, 1000), true);
    assert.equal(crossedAbove(1100, 1200, 1000), false);
  });

  it('wifi_ev_charger session_finished flow + charge-history wire', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wifi_ev_charger/driver.flow.compose.json'),
      'utf8',
    ));
    assert.ok((flow.triggers || []).some((t) => t.id === 'wifi_ev_charger_session_finished'));
    const device = fs.readFileSync(path.join(ROOT, 'drivers/wifi_ev_charger/device.js'), 'utf8');
    assert.ok(device.includes('wifi_ev_charger_session_finished'));
  });

  it('settings Cloud Lookup + Fix It LAN copy; credits docs updated', () => {
    const html = fs.readFileSync(path.join(ROOT, 'settings/index.html'), 'utf8');
    assert.ok(html.includes('Cloud Lookup'));
    assert.ok(html.includes('6668'));
    assert.ok(html.includes('com.tuyalocal'));
    const credits = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md'),
      'utf8',
    );
    assert.ok(credits.includes('P2647'));
  });

  it('wifi_generic_dp_changed preserved (no wipe)', () => {
    const flow = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wifi_generic/driver.flow.compose.json'),
      'utf8',
    ));
    assert.ok((flow.triggers || []).some((t) => t.id === 'wifi_generic_dp_changed'));
  });
});
