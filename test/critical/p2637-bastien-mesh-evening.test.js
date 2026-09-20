'use strict';

/**
 * P2637 — Bastien full mesh evening Contre quoi
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2637 Bastien mesh inventory + couple locks', () => {
  it('liveMesh has ≥20 nodes and no networkKey leak', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/bastien-house-ssot.json'),
      'utf8',
    ));
    assert.ok((ssot.liveMesh?.nodes || []).length >= 20);
    const raw = fs.readFileSync(path.join(ROOT, 'config/architecture/bastien-house-ssot.json'), 'utf8');
    assert.ok(!/networkKey/i.test(raw));
    assert.ok(!/12:4a:2f:84/i.test(raw));
  });

  it('vvmbj46n+TS0601 → lcdtemphumidsensor', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/lcdtemphumidsensor/driver.compose.json'),
      'utf8',
    ));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /vvmbj46n/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('TS0601'));
  });

  it('ltt60asa+TS0004 NOT on switch_1gang; IS on switch_4gang', () => {
    const s1 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_1gang/driver.compose.json'),
      'utf8',
    ));
    const s4 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(s1.zigbee.manufacturerName || []).some((x) => /ltt60asa/i.test(String(x))));
    assert.ok((s4.zigbee.manufacturerName || []).some((x) => /ltt60asa/i.test(String(x))));
  });

  it('dzwgk7e2+TS0042 on button_wireless_2; fllyghyj+SNZB-02 on climate', () => {
    const b2 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_2/driver.compose.json'),
      'utf8',
    ));
    const cl = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'),
      'utf8',
    ));
    assert.ok((b2.zigbee.manufacturerName || []).some((x) => /dzwgk7e2/i.test(String(x))));
    assert.ok((cl.zigbee.manufacturerName || []).some((x) => /fllyghyj/i.test(String(x))));
    assert.ok((cl.zigbee.productId || []).includes('SNZB-02'));
  });

  it('npm check:p2637 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2637']);
  });
});
