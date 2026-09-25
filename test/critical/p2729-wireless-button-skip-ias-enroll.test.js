'use strict';
/**
 * P2729 — Skip proactive IAS enroll on wireless buttons/remotes
 *
 * Contre quoi (Bastien Gmail diag ed627371 @ 1.0.93):
 *   button_wireless_2 logged "[CRITICAL] IAS Zone detected - enrolling..." then
 *   CIE/bind TX while sleepy → "boutons reconnus mais rien ne fonctionne".
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const IASZoneManager = require('../../lib/managers/IASZoneManager');

describe('P2729 wireless button skip IAS enroll', () => {
  it('isWirelessButtonRemoteNotIas true for TS004x drivers, false for SOS/contact', () => {
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'button_wireless_2' } }),
      true,
    );
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'button_wireless_1' } }),
      true,
    );
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'scene_switch_4' } }),
      true,
    );
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'water_leak_sensor' } }),
      false,
    );
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'button_emergency_sos' } }),
      false,
    );
    assert.strictEqual(
      IASZoneManager.isWirelessButtonRemoteNotIas({ driver: { id: 'contact_sensor' } }),
      false,
    );
  });

  it('enrollIASZone early-returns without Zigbee TX for wireless buttons', async () => {
    const logs = [];
    const device = {
      driver: { id: 'button_wireless_2' },
      log: (m) => logs.push(String(m)),
      error: () => {},
      zclNode: { endpoints: { 1: { clusters: { iasZone: { readAttributes: async () => { throw new Error('should not TX'); } } } } } },
    };
    const mgr = new IASZoneManager(device);
    const ok = await mgr.enrollIASZone();
    assert.strictEqual(ok, false);
    assert.ok(logs.some((l) => /P2729|Skip proactive enroll/i.test(l)));
  });

  it('BaseUnifiedDevice background gates IAS + BatteryRouter (source lock)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
    assert.ok(src.includes('P2729'), 'BaseUnifiedDevice must document P2729');
    assert.ok(src.includes('isWirelessButtonRemoteNotIas'), 'must call IAS skip helper');
    assert.ok(/skipBatteryReporting[\s\S]{0,200}bastien_skip_battery_tx/.test(src)
      || /bastien_skip_battery_tx[\s\S]{0,200}skipBatteryReporting/.test(src),
    'must gate BatteryRouter on skipBatteryReporting / Bastien gate');
  });
});
