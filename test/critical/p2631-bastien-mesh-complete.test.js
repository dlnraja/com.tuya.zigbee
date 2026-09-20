'use strict';

/**
 * P2631 — Bastien live mesh Contre quoi
 * eWeLink 7014 → climate only; prune PID bleed; remotes named; SSOT liveMesh.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2631 Bastien mesh complete', () => {
  it('only climate_sensor keeps CK-TLSR8656-SS5-01(7014)', () => {
    const driversDir = path.join(ROOT, 'drivers');
    const holders = [];
    for (const id of fs.readdirSync(driversDir)) {
      const p = path.join(driversDir, id, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      const hit = (c.zigbee?.productId || []).some((x) => /CK-TLSR8656-SS5-01\(7014\)/i.test(String(x)));
      if (hit) holders.push(id);
    }
    assert.deepEqual(holders, ['climate_sensor']);
  });

  it('climate_sensor locks eWeLink mfr + 7014', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'),
      'utf8',
    ));
    assert.ok((c.zigbee.manufacturerName || []).some((x) => /ewelink/i.test(String(x))));
    assert.ok((c.zigbee.productId || []).includes('CK-TLSR8656-SS5-01(7014)'));
  });

  it('climate device.js P2631 noEf00 + strip phantom button', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/device.js'), 'utf8');
    assert.ok(src.includes('P2631'));
    assert.ok(src.includes('noEf00: true'));
    assert.ok(src.includes('strip phantom button'));
  });

  it('button_wireless_1/3 FR names distinguish from remote wall', () => {
    const b1 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    const b3 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'),
      'utf8',
    ));
    assert.ok(/TS0041/i.test(b1.name?.fr || ''));
    assert.ok(/TS0043/i.test(b3.name?.fr || ''));
    assert.ok(!(/mural à distance/i.test(b1.name?.fr || '')));
  });

  it('SSOT liveMesh lists 6 Bastien nodes with NodOn external', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/bastien-house-ssot.json'),
      'utf8',
    ));
    assert.ok(ssot.liveMesh?.nodes?.length >= 6);
    const nodon = ssot.liveMesh.nodes.filter((n) => /NodOn/i.test(n.mfr || ''));
    assert.equal(nodon.length, 2);
    assert.ok(nodon.every((n) => /EXTERNAL/i.test(n.app || '')));
    const ewe = ssot.liveMesh.nodes.find((n) => /ewelink/i.test(n.mfr || ''));
    assert.equal(ewe.driver, 'climate_sensor');
    const axp = ssot.liveMesh.nodes.find((n) => /axpdxqgu/i.test(n.mfr || ''));
    assert.equal(axp.driver, 'button_wireless_1');
  });

  it('npm check:p2631 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2631']);
  });
});
