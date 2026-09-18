'use strict';

/**
 * P2585 — Z2M / herdsman sacred-couple complementary enrich
 *
 * Contre quoi:
 * - Z2M-known (mfr,pid) missing from Homey drivers
 * - o4mkahkc+TS0202 stuck on contact_sensor
 * - ksz749x8+TS0601 stuck on button_wireless_2
 * - compose enrich shrinking manufacturerName arrays
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function hasMfr(composePath, needle) {
  const c = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const m = (c.zigbee?.manufacturerName || []).map((x) => String(x).toLowerCase());
  return m.some((x) => x.includes(String(needle).toLowerCase()));
}

describe('P2585 Z2M herdsman complementary couple enrich', () => {
  it('surgical couples land on correct drivers', () => {
    assert.ok(hasMfr(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'ksz749x8'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/wall_dimmer_tuya/driver.compose.json'), 'da26abzz'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/motion_sensor/driver.compose.json'), 'o4mkahkc'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/button_emergency_sos/driver.compose.json'), 'nxdziqzc'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/switch_2gang/driver.compose.json'), 'aaifmpuq'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/plug_energy_monitor/driver.compose.json'), 'iooniers'));
    assert.ok(hasMfr(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'xgzzuerd'));
  });

  it('misattribution locks motion + climate Contre quoi', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('z2m-o4mkahkc-ts0202-motion'));
    assert.ok(ids.includes('z2m-ksz749x8-ts0601-climate'));
    const motion = reg.cases.find((c) => c.id === 'z2m-o4mkahkc-ts0202-motion');
    assert.strictEqual(motion.canonicalDriver, 'motion_sensor');
    assert.ok((motion.forbidDrivers || []).includes('contact_sensor'));
  });

  it('ZY_M100 config includes ya4ft0w4 sibling (Z2M)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.ok(src.includes('ya4ft0w4'));
  });

  it('tools + npm gate exist; ComplementaryMerge appendExact used', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2585-z2m-herdsman-couple-diff.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2585-z2m-surgical-enrich.js')));
    const enrich = fs.readFileSync(path.join(ROOT, 'tools/ci/p2585-z2m-surgical-enrich.js'), 'utf8');
    assert.ok(enrich.includes('appendExactIdentityForms'));
    assert.ok(!enrich.includes('unionStrings('));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2585']);
  });
});
