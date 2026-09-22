'use strict';

/**
 * P2680 — Diag remotes/lights/relays/sensors fleet Contre quoi (2026-09-22)
 *
 * Contre quoi:
 * - remote_button_wireless_wall EP1 IAS 1280/1281 + EF00 61184 → Generic / silent buttons
 *   (diags e8d98608 / 4d4e1684 tip-lag remotes)
 * - famkxci2 TS0043 profile forced zcl_only → no 0xFD hybrid → "aucun bouton"
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2680 remotes + famkxci2 hybrid + wall remote clusters', () => {
  it('remote_button_wireless_wall EP1 is [0,1,6] — no IAS/EF00/groups', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'), 'utf8')
    );
    const ep1 = c.zigbee.endpoints['1'];
    assert.deepEqual(ep1.clusters.slice().sort((a, b) => a - b), [0, 1, 6]);
    assert.deepEqual(ep1.bindings, [6]);
    const raw = JSON.stringify(ep1);
    assert.ok(!raw.includes('1280') && !raw.includes('1281'), 'no IAS');
    assert.ok(!raw.includes('61184'), 'no EF00');
    assert.ok((c.zigbee.productId || []).includes('TS0041'));
    assert.ok(!(c.zigbee.productId || []).includes('TS0043'), 'TS0043 stays on button_wireless_3');
  });

  it('PhysicalButtonMixin famkxci2 is hybrid skip8004 (not zcl_only)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = src.indexOf("'_TZ3000_famkxci2'");
    assert.ok(idx >= 0);
    const block = src.slice(idx, idx + 450);
    assert.ok(/protocol:\s*'hybrid'/.test(block), 'must be hybrid');
    assert.ok(/skip8004:\s*true/.test(block), 'must skip 0x8004');
    assert.ok(!/protocol:\s*'zcl_only'/.test(block), 'must not be zcl_only');
  });

  it('button_wireless_3 keeps famkxci2 + interview clusters', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8')
    );
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /famkxci2/i.test(m)));
    const ep1 = c.zigbee.endpoints['1'].clusters;
    assert.ok(!ep1.includes(1280) && !ep1.includes(61184));
  });

  it('presence_sensor_radar compose has no onoff capability (lights/sensors class)', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8')
    );
    assert.ok(!(c.capabilities || []).includes('onoff'));
  });
});
