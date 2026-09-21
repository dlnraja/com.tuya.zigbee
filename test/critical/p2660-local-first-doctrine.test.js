'use strict';

/**
 * P2660 — Local-first doctrine Contre quoi locks
 * Dual-app: BOTH (+ Bastien house)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2660 local-first doctrine', () => {
  it('SSOT priority starts with Homey Zigbee mesh; cloud last', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/local-first-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot._meta.id, 'P2660-local-first-ssot');
    assert.equal(ssot.mandate.priorityOrder[0], 'homey_zigbee_mesh');
    assert.equal(
      ssot.mandate.priorityOrder[ssot.mandate.priorityOrder.length - 1],
      'cloud_pairing_or_key_export_only',
    );
    assert.equal(ssot.layers.wifiLan.defaults.cloudFallback, false);
    assert.equal(ssot.layers.wifiLan.defaults.strategy, 'local_first');
  });

  it('WiFiConnectionPolicy defaults are local_first / no cloud fallback', () => {
    const {
      DEFAULT_WIFI_CONNECTION_POLICY,
      allowsCloudFallback,
    } = require('../../lib/wifi/WiFiConnectionPolicy');
    assert.equal(DEFAULT_WIFI_CONNECTION_POLICY.strategy, 'local_first');
    assert.equal(DEFAULT_WIFI_CONNECTION_POLICY.cloudFallback, false);
    assert.equal(DEFAULT_WIFI_CONNECTION_POLICY.cloudMirroring, false);
    assert.equal(allowsCloudFallback({}), false);
    assert.equal(allowsCloudFallback({ cloudFallback: true }), true);
  });

  it('LocalFirstResolver prefers LAN when credentials present', () => {
    const { resolveWiFiTransport } = require('../../lib/wifi/LocalFirstResolver');
    const r = resolveWiFiTransport({
      deviceId: 'bfabcdef1234567890',
      localKey: '0123456789abcdef',
      ip: '192.168.1.50',
      policy: { strategy: 'local_first', cloudFallback: false },
    });
    assert.equal(r.transport, 'lan');
  });

  it('LocalFirstResolver refuses cloud when fallback false', () => {
    const { resolveWiFiTransport } = require('../../lib/wifi/LocalFirstResolver');
    const r = resolveWiFiTransport({
      deviceId: '',
      localKey: '',
      hasCloudCredentials: true,
      policy: { strategy: 'local_first', cloudFallback: false },
    });
    assert.notEqual(r.transport, 'cloud');
  });

  it('CONTROL_PATH_DOCTRINE prefers Homey Zigbee over hub LAN', () => {
    const bridge = require('../../lib/tuya-local/TuyaZigbeeBridge');
    const d = bridge.CONTROL_PATH_DOCTRINE || bridge.controlPathDoctrine;
    assert.ok(d && d.zigbeeEndDeviceHomey);
    assert.match(String(d.zigbeeEndDeviceHomey), /Primary|Homey|coordinator/i);
  });

  it('human doc + cursor rule exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/LOCAL_FIRST_SSOT.md')));
    assert.ok(fs.existsSync(path.join(ROOT, '.cursor/rules/local-first-always.mdc')));
  });
});
