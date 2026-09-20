'use strict';

/**
 * P2642 — Contre quoi: Homey Store Test com.tuyalocal complementary enrich
 * - Charge history proves session kWh (never invent from phase-JSON e/d)
 * - fire_and_forget SET on TuyaLocalClient
 * - OEM work_state IDLE/WORKING map
 * Store: https://homey.app/fr-fr/app/com.tuyalocal/Tuya-Local/test/
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2642 tuyalocal charge-history + fire-and-forget', () => {
  it('parseEvChargerChargeHistory reads c/d and rejects phase JSON', () => {
    const {
      parseEvChargerChargeHistory,
      looksLikeChargeHistory,
      shouldApplyChargeHistory,
      mapEvChargerWorkState,
    } = require('../../lib/tuya-local/EvChargerChargeHistory');

    const hist = { c: 121, d: 9159, t: 'seed-1', s: 1, e: 2 };
    assert.equal(looksLikeChargeHistory(hist), true);
    assert.equal(looksLikeChargeHistory({ L1: [1, 2, 3] }), false);

    const rec = parseEvChargerChargeHistory(hist);
    assert.equal(rec.kwh, 12.1);
    assert.equal(rec.seconds, 9159);
    assert.equal(rec.id, 'seed-1');

    assert.equal(shouldApplyChargeHistory(rec, null), true);
    assert.equal(shouldApplyChargeHistory(rec, 'seed-1'), false);
    assert.equal(shouldApplyChargeHistory({ ...rec, kwh: 0 }, null), false);

    assert.equal(mapEvChargerWorkState('WORKING'), 'plugged_in_charging');
    assert.equal(mapEvChargerWorkState('IDLE'), 'plugged_out');
    assert.equal(mapEvChargerWorkState('charger_charging'), 'plugged_in_charging');
  });

  it('TuyaLocalClient exposes setFireAndForget', () => {
    const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', version: '3.3' });
    assert.equal(typeof c.setFireAndForget, 'function');
    c.setFireAndForget(true);
    assert.equal(c.fireAndForget, true);
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalClient.js'), 'utf8');
    assert.ok(src.includes('Fire-and-forget') || src.includes('fireAndForget'));
  });

  it('wifiLanReliabilitySettings UNION fire_and_forget', () => {
    const {
      WIFI_LAN_RELIABILITY_SETTINGS_ALL,
      resolveFireAndForget,
    } = require('../../lib/tuya-local/wifiLanReliabilitySettings');
    assert.ok(WIFI_LAN_RELIABILITY_SETTINGS_ALL.some((s) => s.id === 'fire_and_forget'));
    assert.equal(resolveFireAndForget({}), false);
    assert.equal(resolveFireAndForget({ fire_and_forget: true }), true);
  });

  it('wifi_ev_charger wires charge history + fire_and_forget settings', () => {
    const device = fs.readFileSync(path.join(ROOT, 'drivers/wifi_ev_charger/device.js'), 'utf8');
    assert.ok(device.includes('EvChargerChargeHistory'));
    assert.ok(device.includes('_applyChargeHistory'));
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/wifi_ev_charger/driver.compose.json'), 'utf8'),
    );
    const flat = [];
    const walk = (arr) => {
      for (const s of arr || []) {
        if (s && s.id) flat.push(s.id);
        if (s && Array.isArray(s.children)) walk(s.children);
      }
    };
    walk(compose.settings);
    assert.ok(flat.includes('dp_charge_history'));
    assert.ok(flat.includes('fire_and_forget'));
    assert.ok(flat.includes('json_session_field'));
  });

  it('credits doc links Homey Store Test + P2642', () => {
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md'),
      'utf8',
    );
    assert.ok(doc.includes('homey.app'));
    assert.ok(doc.includes('com.tuyalocal'));
    assert.ok(doc.includes('P2642'));
    assert.ok(doc.includes('Charge history'));
  });

  it('dual-app tracks classify P2642', () => {
    const tracks = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/dual-app-tracks.json'), 'utf8'),
    );
    assert.equal(tracks.domains.p2642_tuyalocal_charge_history_fof.tag, 'MASTER_ONLY');
    assert.equal(tracks.domains.p2642_tuyalocal_fire_and_forget_lan.tag, 'BOTH');
  });
});
