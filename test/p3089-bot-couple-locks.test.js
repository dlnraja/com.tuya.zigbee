'use strict';
/* eslint-env mocha */
// P3089: the 9.0.1604 publish bot re-added HOBEIAN on sensor_contact_zigbee (old p61 re-inject rule, against the
// P3077 batch 2 move) and "sonoff" next to SONOFF on the dedicated MINI-ZBRBS driver (case-variant pass).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const locks = require('../scripts/lib/couple-locks');

describe('P3089 bot passes respect couple locks', () => {
  it('a P3077 move is a lock for that driver only, case-insensitive', () => {
    assert.ok(locks.retiredOn(ROOT, 'sensor_contact_zigbee', 'hobeian'));
    assert.ok(locks.retiredOn(ROOT, 'sensor_contact_zigbee', 'HOBEIAN'));
    assert.strictEqual(locks.retiredOn(ROOT, 'contact_sensor', 'HOBEIAN'), null);
    assert.strictEqual(locks.retiredOn(ROOT, 'sensor_contact_zigbee', '_TZ3000_unknownxx'), null);
  });
  it('missing lock files never throw', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3089-'));
    assert.strictEqual(locks.retiredOn(tmp, 'x', 'y'), null);
    assert.strictEqual(locks.isExactIdentityDriver(tmp, 'x'), false);
  });
  it('ensure-case-variants leaves an exact-identity driver byte-exact', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3089-'));
    fs.mkdirSync(path.join(tmp, 'config/architecture'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'config/architecture/exact-identity-drivers.json'), path.join(tmp, 'config/architecture/exact-identity-drivers.json'));
    for (const d of ['curtain_sonoff_mini_zbrbs', 'other_drv']) {
      fs.mkdirSync(path.join(tmp, 'drivers', d), { recursive: true });
      fs.writeFileSync(path.join(tmp, 'drivers', d, 'driver.compose.json'), JSON.stringify({ zigbee: { manufacturerName: ['SONOFF'], productId: ['MINI-ZBRBS'] } }));
    }
    execFileSync(process.execPath, [path.join(ROOT, 'tools/ci/ensure-case-variants.js'), '--apply', '--root', tmp], { stdio: 'pipe' });
    const read = (d) => JSON.parse(fs.readFileSync(path.join(tmp, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee.manufacturerName;
    assert.deepStrictEqual(read('curtain_sonoff_mini_zbrbs'), ['SONOFF']);
    assert.ok(read('other_drv').length >= 1);
  });
  it('the repo state matches the locks', () => {
    const z = (d) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee.manufacturerName;
    assert.deepStrictEqual(z('curtain_sonoff_mini_zbrbs'), ['SONOFF']);
    assert.ok(!z('sensor_contact_zigbee').some((m) => m.toLowerCase() === 'hobeian'));
  });
});
