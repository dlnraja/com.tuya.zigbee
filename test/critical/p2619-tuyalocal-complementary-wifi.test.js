'use strict';

/**
 * P2619 — Contre quoi: andiwirz/com.tuyalocal complementary enrich
 * - auto protocol order must be frequency-first (3.3 first), not newest-first
 * - offline grace + command gap settings helpers
 * - WiFiDPRegistry UNION categories (heat pump / EV / smoke / kettle…)
 * Never degrade: PROTOCOL_VERSIONS set still complete; settings append-only.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2619 com.tuyalocal complementary WiFi enrich', () => {
  it('PAIRING_PROTOCOL_ORDER is frequency-first like com.tuyalocal', () => {
    const {
      PAIRING_PROTOCOL_ORDER,
      PROTOCOL_VERSIONS,
      buildProtocolFallbackChain,
    } = require('../../lib/tuya-local/UdpDiscoveryKeys');
    assert.deepEqual([...PAIRING_PROTOCOL_ORDER], ['3.3', '3.4', '3.1', '3.5', '3.2']);
    assert.ok(PROTOCOL_VERSIONS.includes('3.5') && PROTOCOL_VERSIONS.includes('3.1'));
    assert.deepEqual(buildProtocolFallbackChain('auto'), ['3.3', '3.4', '3.1', '3.5', '3.2']);
    assert.equal(buildProtocolFallbackChain('3.5')[0], '3.5');
    assert.ok(buildProtocolFallbackChain('3.5').includes('3.3'));
  });

  it('wifiLanReliabilitySettings expose command gap + offline grace defaults', () => {
    const {
      DEFAULT_COMMAND_GAP_MS,
      DEFAULT_OFFLINE_GRACE_SECONDS,
      WIFI_LAN_RELIABILITY_SETTINGS,
      resolveCommandGapMs,
      resolveOfflineGraceMs,
    } = require('../../lib/tuya-local/wifiLanReliabilitySettings');
    assert.equal(DEFAULT_COMMAND_GAP_MS, 100);
    assert.equal(DEFAULT_OFFLINE_GRACE_SECONDS, 60);
    const ids = WIFI_LAN_RELIABILITY_SETTINGS.map((s) => s.id);
    assert.ok(ids.includes('command_gap_ms'));
    assert.ok(ids.includes('offline_grace_seconds'));
    assert.equal(resolveCommandGapMs({}), 100);
    assert.equal(resolveCommandGapMs({ command_gap_ms: 250 }), 250);
    assert.equal(resolveOfflineGraceMs({}), 60000);
    assert.equal(resolveOfflineGraceMs({ offline_grace_seconds: 30 }), 30000);
  });

  it('TuyaLocalClient exposes setCommandGap', () => {
    const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', version: '3.3' });
    assert.equal(typeof c.setCommandGap, 'function');
    c.setCommandGap(250);
    assert.equal(c.commandGapMs, 250);
  });

  it('WiFiDPRegistry UNION includes tuyalocal categories (rs/qccdz/ywbj smoke/sj water)', () => {
    const { CATEGORY_DP_HINTS } = require('../../lib/tuya-local/WiFiDPRegistry');
    assert.equal(CATEGORY_DP_HINTS.rs[1].capability, 'onoff');
    // P2641: qccdz switch is DP18; DP1 is lifetime energy (UNION, not wipe)
    assert.equal(CATEGORY_DP_HINTS.qccdz[18].capability, 'onoff');
    assert.equal(CATEGORY_DP_HINTS.qccdz[1].capability, 'meter_power');
    assert.equal(CATEGORY_DP_HINTS.bh[1].capability, 'onoff');
    assert.equal(CATEGORY_DP_HINTS.ywbj[1].capability, 'alarm_smoke');
    assert.equal(CATEGORY_DP_HINTS.sj[1].capability, 'alarm_water');
    assert.equal(CATEGORY_DP_HINTS.zndb[1].capability, 'measure_power');
    assert.equal(CATEGORY_DP_HINTS.zndb[19].capability, 'measure_power');
  });

  it('core Tuya wifi_pet_feeder compose has offline_grace + command_gap (append-only)', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/wifi_pet_feeder/driver.compose.json'), 'utf8'),
    );
    const flat = [];
    const walk = (arr) => {
      for (const s of arr || []) {
        if (s && s.id) flat.push(s.id);
        if (s && Array.isArray(s.children)) walk(s.children);
      }
    };
    walk(compose.settings);
    assert.ok(flat.includes('offline_grace_seconds'), 'offline_grace_seconds missing');
    assert.ok(flat.includes('command_gap_ms'), 'command_gap_ms missing');
    assert.ok(flat.includes('protocol_version'), 'must not wipe protocol_version');
    assert.ok(flat.includes('device_id'), 'must not wipe device_id');
  });

  it('TuyaLocalDevice source wires offline grace + command gap (P2619)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDevice.js'), 'utf8');
    assert.ok(src.includes('resolveOfflineGraceMs'));
    assert.ok(src.includes('resolveCommandGapMs'));
    assert.ok(src.includes('_clearOfflineGraceTimers'));
    assert.ok(src.includes('wifiLanReliabilitySettings'));
  });
});
