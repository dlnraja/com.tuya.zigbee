'use strict';

/**
 * P2641 — Contre quoi: andiwirz/com.tuyalocal 1.0.23x complementary enrich
 * - EvChargerPhaseJson must parse L1/L2/L3 JSON (never invent lifetime from "d")
 * - TuyaLocalClient stale-data watchdog must exist and ignore heartbeat alone
 * - WiFiDPRegistry UNION qccdz DP18 onoff + ywbj/hjjcy/wnykq hints
 * - SourceCredits + credits doc name andiwirz / T154077
 * Dual-app: MASTER_ONLY (WiFi drivers) + BOTH (LAN stale-data client).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2641 tuyalocal complementary (phase-JSON + stale-data + credits)', () => {
  it('parseEvChargerPhaseJson decodes L1/L2/L3 tenths and never invents from d', () => {
    const {
      parseEvChargerPhaseJson,
      looksLikePhaseJson,
    } = require('../../lib/tuya-local/EvChargerPhaseJson');

    const sample = JSON.stringify({
      L1: [2320, 55, 12],
      L2: [2320, 58, 13],
      L3: [2320, 56, 13],
      t: 370,
      p: 39,
      d: 54150,
      e: 113,
    });
    assert.equal(looksLikePhaseJson(sample), true);
    assert.equal(looksLikePhaseJson('not-json'), false);

    const none = parseEvChargerPhaseJson(sample);
    assert.ok(none);
    assert.equal(none.phases.L1.voltage, 232);
    assert.equal(none.phases.L1.current, 5.5);
    assert.equal(none.totalPowerW, 3900);
    assert.equal(none.temperatureC, 37);
    assert.equal(none.sessionKwh, null, 'default sessionField=none — do not invent');

    const withE = parseEvChargerPhaseJson(sample, { sessionField: 'e', energyDivisor: 10 });
    assert.equal(withE.sessionKwh, 11.3);

    assert.equal(parseEvChargerPhaseJson('{bad'), null);
    assert.equal(parseEvChargerPhaseJson({ foo: 1 }), null);
  });

  it('TuyaLocalClient exposes setDataTimeout and heartbeat does not call _noteDeviceData', () => {
    const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/tuya-local/TuyaLocalClient.js'),
      'utf8',
    );
    assert.ok(src.includes('setDataTimeout'));
    assert.ok(src.includes('_noteDeviceData'));
    assert.ok(src.includes('stale-data') || src.includes('silent for'));
    // Heartbeat must not rearm data watchdog
    assert.ok(/d\.on\('heartbeat'[\s\S]*?_missedHeartbeats = 0/.test(src));
    assert.ok(!/d\.on\('heartbeat'[\s\S]*?_noteDeviceData/.test(src));

    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', version: '3.3' });
    assert.equal(typeof c.setDataTimeout, 'function');
    c.setDataTimeout(30000);
    assert.equal(c.dataTimeoutMs, 90000, 'min window 90s');
    c.setDataTimeout(60000);
    assert.equal(c.dataTimeoutMs, 180000, '3× poll when > 90s');
    c.setDataTimeout(0);
    assert.equal(c.dataTimeoutMs, 0, 'push-only disables');
  });

  it('wifi_ev_charger wires EvChargerPhaseJson + dp_phase_json setting', () => {
    const device = fs.readFileSync(
      path.join(ROOT, 'drivers/wifi_ev_charger/device.js'),
      'utf8',
    );
    assert.ok(device.includes('EvChargerPhaseJson'));
    assert.ok(device.includes('parseEvChargerPhaseJson'));
    assert.ok(device.includes('_applyPhaseJson'));
    const compose = readJson('drivers/wifi_ev_charger/driver.compose.json');
    const flat = [];
    const walk = (arr) => {
      for (const s of arr || []) {
        if (s && s.id) flat.push(s.id);
        if (s && Array.isArray(s.children)) walk(s.children);
      }
    };
    walk(compose.settings);
    assert.ok(flat.includes('dp_phase_json'));
    assert.ok(flat.includes('json_session_field'));
  });

  it('WiFiDPRegistry UNION qccdz DP18 + air/IR/smoke hints', () => {
    const { CATEGORY_DP_HINTS } = require('../../lib/tuya-local/WiFiDPRegistry');
    assert.equal(CATEGORY_DP_HINTS.qccdz[18].capability, 'onoff');
    assert.equal(CATEGORY_DP_HINTS.qccdz[102].type, 'raw');
    assert.equal(CATEGORY_DP_HINTS.ywbj[2].capability, 'measure_smoke');
    assert.equal(CATEGORY_DP_HINTS.hjjcy[4].capability, 'measure_co2');
    assert.equal(CATEGORY_DP_HINTS.wnykq[201].capability, 'button');
    assert.ok(CATEGORY_DP_HINTS.qxj);
    assert.ok(CATEGORY_DP_HINTS.cjsq);
  });

  it('SourceCredits + credits doc attribute andiwirz / T154077', () => {
    const credits = require('../../lib/data/SourceCredits');
    assert.ok(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ);
    assert.ok(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ.repository.includes('andiwirz/com.tuyalocal'));
    assert.ok(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ.website.includes('com.tuyalocal'));
    assert.ok(String(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ.forum || '').includes('154077'));
    assert.equal(credits.SOURCES.TUYA_LOCAL_ANDIWIRZ.license, 'MIT');
    assert.ok(
      (credits.COMMUNITY_CONTRIBUTORS || []).some((c) => c.github === 'andiwirz'),
    );
    const doc = fs.readFileSync(
      path.join(ROOT, 'docs/architecture/TUYALOCAL_COMPLEMENTARY_CREDITS.md'),
      'utf8',
    );
    assert.ok(doc.includes('andiwirz/com.tuyalocal'));
    assert.ok(doc.includes('154077'));
    assert.ok(doc.includes('P2641'));
  });

  it('dual-app tracks: P2641 WiFi MASTER_ONLY + LAN stale BOTH', () => {
    const tracks = readJson('config/architecture/dual-app-tracks.json');
    assert.equal(tracks.domains.p2641_tuyalocal_phase_json_wifi.tag, 'MASTER_ONLY');
    assert.equal(tracks.domains.p2641_tuyalocal_stale_data_lan.tag, 'BOTH');
  });
});
