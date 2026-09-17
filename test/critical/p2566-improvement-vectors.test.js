'use strict';

/**
 * P2566 — Additional unbranded improvement vectors
 *
 * Contre quoi:
 * - Path Light quiet hours duplicated ad-hoc without shared QuietHoursGuard
 * - missing Contact Entry / Shade Daylight / Peak Shed / Idle Auto-Off / Night Path
 * - Path Light ignores night dim bias
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const QuietHoursGuard = require(path.join(ROOT, 'lib/features/QuietHoursGuard.js'));
const NightPathBias = require(path.join(ROOT, 'lib/features/NightPathBias.js'));
const ContactEntrySoft = require(path.join(ROOT, 'lib/features/ContactEntrySoft.js'));
const ShadeDaylightSoft = require(path.join(ROOT, 'lib/features/ShadeDaylightSoft.js'));
const PeakLoadSoftShed = require(path.join(ROOT, 'lib/features/PeakLoadSoftShed.js'));
const IdleAutoOffSoft = require(path.join(ROOT, 'lib/features/IdleAutoOffSoft.js'));
const SmartGatewayFeatureHub = require(path.join(ROOT, 'lib/features/SmartGatewayFeatureHub.js'));

describe('P2566 Quiet Hours + Night Path', () => {
  it('detects overnight quiet window', () => {
    const d = new Date('2026-09-17T23:30:00');
    assert.equal(QuietHoursGuard.isInQuietHours('22:00', '07:00', d), true);
    const noon = new Date('2026-09-17T12:00:00');
    assert.equal(QuietHoursGuard.isInQuietHours('22:00', '07:00', noon), false);
  });

  it('applies night bias factor', () => {
    const nightApp = { homeModeManager: { mode: 'night' } };
    const dayApp = { homeModeManager: { mode: 'day' } };
    assert.ok(NightPathBias.applyNightBias(1, nightApp) < 0.5);
    assert.equal(NightPathBias.applyNightBias(0.8, dayApp), 0.8);
  });
});

describe('P2566 Contact / Shade / Peak / Idle', () => {
  it('contact entry enrolls', () => {
    const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
    const c = new ContactEntrySoft({ homey: fakeHomey, log: () => {} });
    const contact = {
      getData: () => ({ id: 'door' }),
      hasCapability: (x) => x === 'alarm_contact',
      getCapabilityValue: () => false,
    };
    const light = { getName: () => 'L', hasCapability: () => true };
    const res = c.enroll(contact, [light]);
    assert.equal(res.lights, 1);
    c.destroy();
  });

  it('shade daylight enrolls cover', () => {
    const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
    const s = new ShadeDaylightSoft({ homey: fakeHomey, log: () => {}, solarElevation: { getElevation: () => 20 } });
    assert.equal(s.enroll({ hasCapability: () => true }), true);
    s.destroy();
  });

  it('peak shed enrolls meter+lights', () => {
    const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
    const p = new PeakLoadSoftShed({ homey: fakeHomey, log: () => {} });
    const meter = { hasCapability: (c) => c === 'measure_power', getCapabilityValue: () => 100 };
    const light = { hasCapability: () => true, getCapabilityValue: () => 0.8 };
    const res = p.enroll(meter, [light], { thresholdW: 2000 });
    assert.equal(res.lights, 1);
    assert.equal(res.thresholdW, 2000);
    p.destroy();
  });

  it('idle auto-off enrolls', () => {
    const fakeHomey = { setInterval: () => 1, clearInterval: () => {} };
    const i = new IdleAutoOffSoft({ homey: fakeHomey, log: () => {} });
    const light = {
      getData: () => ({ id: 'x' }),
      hasCapability: () => true,
      getCapabilityValue: () => true,
      getName: () => 'L',
    };
    const res = i.enroll(light, { idleMinutes: 15 });
    assert.equal(res.idleMinutes, 15);
    i.destroy();
  });
});

describe('P2566 hub + wiring + SSOT', () => {
  it('hub boots P2566 modules', () => {
    const app = {
      log: () => {},
      error: () => {},
      homey: {
        setInterval: () => 1,
        clearInterval: () => {},
        flow: { getTriggerCard: () => null },
        drivers: { getDrivers: () => ({}) },
      },
    };
    const hub = new SmartGatewayFeatureHub(app).start();
    assert.ok(hub.contactEntry);
    assert.ok(hub.shadeDaylight);
    assert.ok(hub.peakShed);
    assert.ok(hub.idleAutoOff);
    assert.equal(typeof hub.isInQuietHours, 'function');
    hub.stop();
  });

  it('app.js uses QuietHoursGuard + NightPathBias + P2566 cards', () => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(appJs.includes('QuietHoursGuard'));
    assert.ok(appJs.includes('NightPathBias'));
    assert.ok(appJs.includes('contact_entry_soft_enroll'));
    assert.ok(appJs.includes('shade_daylight_soft_enroll'));
    assert.ok(appJs.includes('peak_load_soft_shed_enroll'));
    assert.ok(appJs.includes('idle_auto_off_soft_enroll'));
    assert.ok(appJs.includes('quiet_hours_is_active'));
  });

  it('flow compose cards exist branding-free', () => {
    const files = [
      '.homeycompose/flow/conditions/quiet_hours_is_active.json',
      '.homeycompose/flow/conditions/night_path_is_active.json',
      '.homeycompose/flow/actions/contact_entry_soft_enroll.json',
      '.homeycompose/flow/actions/shade_daylight_soft_enroll.json',
      '.homeycompose/flow/actions/peak_load_soft_shed_enroll.json',
      '.homeycompose/flow/actions/idle_auto_off_soft_enroll.json',
    ];
    for (const rel of files) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
      const title = JSON.stringify(j.title || {});
      assert.ok(!title.includes('Lutron'));
      assert.ok(!title.includes('Philips'));
      assert.ok(!title.includes('Aqara'));
    }
  });
});
