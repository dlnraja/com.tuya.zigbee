'use strict';

/**
 * P2559 — Fine forum/GitHub treat: #533 ZTS / #547 gkfbdvyx / AM43 magic + front-pin
 *
 * Contre quoi:
 * - Moes ZTS / AM43 EF00 TX without magic → silent / UNSUPPORTED_CLUSTER
 * - gkfbdvyx pairs but no function / leaves mesh without magic
 * - Athom compact drops late mfrs — front-pin sacred couples
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2559 fine forum/GitHub treat', () => {
  it('curtain_motor front-pins 5slehgeo + has cover magic handshake', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const head = (compose.zigbee.manufacturerName || []).slice(0, 12).map((m) => String(m).toLowerCase());
    assert.ok(head.some((m) => m.includes('5slehgeo')), '5slehgeo must be front-pinned');
    assert.ok((compose.zigbee.productId || []).some((p) => String(p).toUpperCase() === 'TS0601'));

    const src = fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/device.js'), 'utf8');
    assert.match(src, /_ensureCoverMagicHandshake/);
    assert.match(src, /P2559/);
    assert.match(src, /_isMoesZtsEurC\(\) \|\| this\._isBatteryTubularRoller/);
  });

  it('presence radar front-pins gkfbdvyx/clrdrnya + magic + TZE284 mains', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const head = (compose.zigbee.manufacturerName || []).slice(0, 16).map((m) => String(m).toLowerCase());
    assert.ok(head.some((m) => m.includes('gkfbdvyx')));
    assert.ok(head.some((m) => m.includes('clrdrnya')));

    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(src, /_ensureRadarMagicHandshake/);
    assert.match(src, /_tze284_gkfbdvyx/);

    const cfg = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.match(cfg, /_TZE284_gkfbdvyx/);
    assert.match(cfg, /clearPresenceOnZeroDistance:\s*true/);
  });

  it('wall_dimmer front-pins m1cvyneb (PresentSky)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/wall_dimmer_tuya/driver.compose.json'), 'utf8'));
    const head = (compose.zigbee.manufacturerName || []).slice(0, 6).map((m) => String(m).toLowerCase());
    assert.ok(head.some((m) => m.includes('m1cvyneb')));
  });
});
