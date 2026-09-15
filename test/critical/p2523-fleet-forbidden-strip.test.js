'use strict';

/**
 * P2523 — Fleet L99: doNotLock invent must not re-inject onto forbidden drivers
 * Contre quoi: Fleet Intelligent Enrich anti-bot red (krwtzhfd|TS004F on climate)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  isForbiddenPlacement,
  isForbiddenDriver,
} = require('../../lib/pairing/UserMisattributionRegistry');

describe('P2523 strip registry-forbidden enrich bleed', () => {
  it('doNotLock krwtzhfd blocks climate_sensor placement (mfr-only)', () => {
    assert.strictEqual(isForbiddenPlacement('_TZ3000_krwtzhfd', 'climate_sensor'), true);
    assert.strictEqual(isForbiddenDriver('_TZ3000_krwtzhfd', 'TS004F', 'climate_sensor'), true);
  });

  it('climate compose + app.json have no krwtzhfd / 8eazvzo6 / TS004F', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'),
      'utf8',
    ));
    assert.ok(!(c.zigbee.manufacturerName || []).some((m) => /krwtzhfd|8eazvzo6/i.test(m)));
    assert.ok(!(c.zigbee.productId || []).some((p) => /^TS004F$/i.test(p)));
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = a.drivers.find((x) => x.id === 'climate_sensor');
    assert.ok(d);
    assert.ok(!(d.zigbee.manufacturerName || []).some((m) => /krwtzhfd|8eazvzo6/i.test(m)));
    assert.ok(!(d.zigbee.productId || []).some((p) => /^TS004F$/i.test(p)));
  });

  it('fleet workflow + orchestrator wire strip + hard anti-bot', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/fleet-intelligent-enrich.yml'),
      'utf8',
    );
    assert.ok(yml.includes('strip-registry-forbidden-compose.js'));
    assert.ok(yml.includes('p2519-anti-regression-enrich-gate.js'));
    const fleet = fs.readFileSync(
      path.join(ROOT, 'tools/ci/fleet-intelligent-enrich.js'),
      'utf8',
    );
    assert.ok(fleet.includes('strip-registry-forbidden'));
    assert.ok(/anti-bot-regression-gate\.js',\s*\[\],\s*180000,\s*false/.test(fleet)
      || fleet.includes("run('anti-bot', 'tools/ci/anti-bot-regression-gate.js', [], 180000, false)"));
  });

  it('strip script exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/strip-registry-forbidden-compose.js')));
  });
});
