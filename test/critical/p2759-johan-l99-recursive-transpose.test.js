'use strict';

/**
 * P2759 — Johan L99 recursive transpose (forks/issues/PRs → OUR apps)
 *
 * Contre quoi:
 * - `_TZE200_vrcfo4i0` air-monitor stolen by IAS contact_sensor (Johan #1489)
 * - Moes SR-ZS `_TZ3002_vaq2bfcu`+TS0726 parked on switch_1gang (Johan #1478)
 * - TS0207 IAS leak family from Johan #1041 missing from water_leak_sensor
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2759 Johan L99 recursive transpose locks', () => {
  it('vrcfo4i0+TS0601 stays gas_sensor (not IAS contact_sensor)', () => {
    const gas = compose('gas_sensor');
    assert.ok(gas.zigbee.productId.includes('TS0601'));
    assert.ok(gas.zigbee.manufacturerName.some((m) => /vrcfo4i0/i.test(m)));
    const contact = compose('contact_sensor');
    assert.ok(!contact.zigbee.manufacturerName.some((m) => /vrcfo4i0/i.test(m)));
  });

  it('vaq2bfcu+TS0726 Moes SR-ZS on switch_3gang not switch_1gang', () => {
    const g3 = compose('switch_3gang');
    assert.ok(g3.zigbee.productId.includes('TS0726'));
    assert.ok(g3.zigbee.manufacturerName.some((m) => /vaq2bfcu/i.test(m)));
    const g1 = compose('switch_1gang');
    assert.ok(!g1.zigbee.manufacturerName.some((m) => /vaq2bfcu/i.test(m)));
  });

  it('Johan #1041 TS0207 leak family locked on water_leak_sensor', () => {
    const wl = compose('water_leak_sensor');
    assert.ok(wl.zigbee.productId.includes('TS0207'));
    for (const suf of ['bzt33cyu', 'bfopm9ga', '4qaowtdo', 'qhozxs2b', 'baeiitad', 'k4ej3ww2']) {
      assert.ok(
        wl.zigbee.manufacturerName.some((m) => String(m).toLowerCase().includes(suf)),
        `missing ${suf}`,
      );
    }
  });

  it('lcdtemphumidsensor_3 listens reporting+response (Johan #1474)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/lcdtemphumidsensor_3/device.js'), 'utf8');
    assert.match(src, /on\(\s*['"]reporting['"]/);
    assert.match(src, /on\(\s*['"]response['"]/);
    const c = compose('lcdtemphumidsensor_3');
    assert.ok(c.zigbee.manufacturerName.some((m) => /locansqn/i.test(m)));
  });
});
