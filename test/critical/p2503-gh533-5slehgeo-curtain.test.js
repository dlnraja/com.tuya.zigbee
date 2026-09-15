'use strict';

/**
 * P2503 — GH#533 Moes ZTS-EUR-C Contre quoi
 * `_TZE204_5slehgeo`+TS0601 must stay curtain_motor; never climate/TRV bleed.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2503 GH#533 Moes 5slehgeo curtain sacred couple', () => {
  it('compose curtain_motor lists TZE200/204/284 5slehgeo + TS0601', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'),
      'utf8',
    ));
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(mfrs.some((m) => /_TZE204_5slehgeo/i.test(m)));
    assert.ok(mfrs.some((m) => /_TZE284_5slehgeo/i.test(m)));
    assert.ok(mfrs.some((m) => /_TZE200_5slehgeo/i.test(m)));
    assert.ok((compose.zigbee?.productId || []).includes('TS0601'));
  });

  it('climate_sensor compose must NOT claim 5slehgeo', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'),
      'utf8',
    ));
    const mfrs = compose.zigbee?.manufacturerName || [];
    assert.ok(!mfrs.some((m) => /5slehgeo/i.test(m)), 'climate must not steal Moes curtain couple');
  });

  it('misattribution forbids climate + TRV for 5slehgeo couple', () => {
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const list = reg.cases || [];
    const hit = list.find((e) =>
      Array.isArray(e.mfr) && e.mfr.some((m) => /5slehgeo/i.test(m)) && e.canonicalDriver === 'curtain_motor',
    );
    assert.ok(hit, 'registry row for 5slehgeo → curtain_motor');
    assert.ok(hit.forbiddenDrivers.includes('climate_sensor'));
    assert.ok(hit.forbiddenDrivers.includes('radiator_valve'));
  });

  it('sacred-keep pins 5slehgeo family', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
      'utf8',
    ));
    const couples = keep.couples || [];
    assert.ok(couples.some((c) => /5slehgeo/i.test(c.mfr) && c.pid === 'TS0601' && c.driverId === 'curtain_motor'));
  });

  it('current-fps maps 5slehgeo to curtain_motor not climate (soft if absent on LTS)', () => {
    const fpsPath = path.join(ROOT, 'scripts/data/current-fps.json');
    if (!fs.existsSync(fpsPath)) {
      assert.ok(true, 'stable LTS may omit current-fps — registry+compose lock enough');
      return;
    }
    const fps = JSON.parse(fs.readFileSync(fpsPath, 'utf8'));
    const blob = JSON.stringify(fps);
    assert.ok(!/"_TZE204_5slehgeo":\s*\[\s*"climate_sensor"\s*\]/.test(blob));
    if (/"_TZE204_5slehgeo"/.test(blob)) {
      assert.ok(/"_TZE204_5slehgeo":\s*\[\s*"curtain_motor"\s*\]/.test(blob));
    }
  });
});
