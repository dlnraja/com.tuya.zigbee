'use strict';
/**
 * P2704 — Contre quoi: WiFiDPRegistry hints were inert (getter dpMappings + pre-warmed map);
 * generic hints must not hijack a capability's write DP; curated product hint for
 * gxrtu5vljdthtd3g (tuya-local dewall_evcharger.yaml + forum 154077 #426) moves start/stop to DP140.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { enrichWiFiDpMappings } = require('../../lib/tuya-local/WiFiDPRegistry');

const mk = (settings, maps) => ({ dpMappings: maps, getSettings: () => settings, getSetting: (k) => settings[k], getStore: () => ({}), getData: () => ({}), log() {} });

describe('P2704 registry', () => {
  it('TuyaLocalDevice pins dpMappings before enrichment and invalidates the map after', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'tuya-local', 'TuyaLocalDevice.js'), 'utf8');
    const pin = src.indexOf("Object.defineProperty(this, 'dpMappings'");
    const enrich = src.indexOf('enrichWiFiDpMappings(this)');
    const inval = src.indexOf('CapabilityMapCache.invalidate(this)');
    assert.ok(pin > 0 && pin < enrich && enrich < inval);
  });
  it('gxrtu5vljdthtd3g: DP140 onoff, DP18 disabled', () => {
    const d = mk({ product_id: 'gxrtu5vljdthtd3g', category: 'qccdz' }, { 18: { capability: 'onoff' }, 9: { capability: 'measure_power' } });
    enrichWiFiDpMappings(d);
    assert.equal(d.dpMappings[140].capability, 'onoff');
    assert.equal(d.dpMappings[18].capability, null);
  });
  it('category hints never add a second DP for an already-bound capability', () => {
    const d = mk({ category: 'qccdz' }, { 27: { capability: 'onoff' }, 9: { capability: 'measure_power' } });
    enrichWiFiDpMappings(d);
    assert.equal(d.dpMappings[18], undefined);
  });
});
