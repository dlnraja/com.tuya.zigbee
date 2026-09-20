'use strict';

/**
 * P2626 — Contre quoi: app.json fingerprint drift
 * Compose sacred couples MUST appear in app.json or Homey pairs to
 * virtualdriverzigbee / wrong driver → no Bastien flow cards fire.
 *
 * Locks: axpdxqgu+TS0041 → button_wireless_1 (not remote wall)
 *        vsxvaj9i+TS0043 → button_wireless_3 (not virtual socket)
 *        eWeLink CK-TLSR → climate_sensor
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function driverZigbee(app, id) {
  const d = (app.drivers || []).find((x) => x.id === id);
  assert.ok(d, `app.json missing driver ${id}`);
  return d.zigbee || {};
}

function hasMfr(zigbee, re) {
  return (zigbee.manufacturerName || []).some((x) => re.test(String(x)));
}

function hasPid(zigbee, pid) {
  return (zigbee.productId || []).includes(pid);
}

describe('P2626 app.json sacred-couple sync (no virtualdriver steal)', () => {
  it('button_wireless_1 app.json locks axpdxqgu+TS0041', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const z = driverZigbee(app, 'button_wireless_1');
    assert.ok(hasMfr(z, /axpdxqgu/i), 'axpdxqgu missing from button_wireless_1 app.json');
    assert.ok(hasPid(z, 'TS0041'));
    const remote = driverZigbee(app, 'remote_button_wireless_wall');
    assert.ok(!hasMfr(remote, /axpdxqgu/i), 'axpdxqgu must not stay on remote_button_wireless_wall in app.json');
  });

  it('button_wireless_3 app.json locks vsxvaj9i+TS0043 + device-view buttons', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = (app.drivers || []).find((x) => x.id === 'button_wireless_3');
    assert.ok(d);
    assert.ok(hasMfr(d.zigbee, /vsxvaj9i/i), 'vsxvaj9i missing from button_wireless_3 app.json — Homey uses virtualdriver');
    assert.ok(hasPid(d.zigbee, 'TS0043'));
    for (const cap of ['button.1', 'button.2', 'button.3']) {
      assert.ok((d.capabilities || []).includes(cap), `missing ${cap}`);
      assert.equal(d.capabilitiesOptions?.[cap]?.maintenanceAction, false, `${cap} must be device-view`);
    }
  });

  it('climate_sensor app.json locks eWeLink CK-TLSR couple', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const z = driverZigbee(app, 'climate_sensor');
    assert.ok(hasMfr(z, /^ewelink$/i), 'eWeLink missing from climate_sensor app.json');
    assert.ok(
      (z.productId || []).some((p) => /CK-TLSR8656-SS5-01\(7014\)/i.test(String(p))),
      'CK-TLSR pid missing from climate_sensor app.json',
    );
  });

  it('compose and app.json agree on vsxvaj9i / axpdxqgu (no drift)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const c3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    const c1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'), 'utf8'));
    const a3 = driverZigbee(app, 'button_wireless_3');
    const a1 = driverZigbee(app, 'button_wireless_1');
    const composeHas = (c, re) => (c.zigbee?.manufacturerName || []).some((x) => re.test(String(x)));
    assert.equal(composeHas(c3, /vsxvaj9i/i), hasMfr(a3, /vsxvaj9i/i));
    assert.equal(composeHas(c1, /axpdxqgu/i), hasMfr(a1, /axpdxqgu/i));
  });

  it('npm check:p2626 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2626']);
  });
});
