'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
/**
 * Fleet Intelligent Enrich failed in master-automation-fix ("ZIGBEE sans MF") once backups/stable_app.json
 * left the repo (9640f715af). Deliberate pid-only drivers are now declared in config/pid-only-drivers.json.
 * Guard: every entry has a reason, a real driver, an empty manufacturerName and a non-empty productId
 * (so the list cannot hide a driver that lost its couples by accident).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'pid-only-drivers.json'), 'utf8'));

describe('P2862 pid-only drivers config', () => {
  it('each entry is documented and matches the real compose', () => {
    assert.ok(cfg.drivers.length > 0);
    for (const e of cfg.drivers) {
      assert.ok(e.id && e.reason, `entry needs id + reason: ${JSON.stringify(e)}`);
      const f = path.join(ROOT, 'drivers', e.id, 'driver.compose.json');
      assert.ok(fs.existsSync(f), `${e.id}: driver missing`);
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
      assert.strictEqual((z.manufacturerName || []).length, 0, `${e.id}: has manufacturerName, remove it from the list`);
      assert.ok((z.productId || []).length > 0, `${e.id}: no productId`);
    }
  });
  it('every zigbee driver without manufacturerName is either listed or held', () => {
    const listed = new Set(cfg.drivers.map((e) => e.id));
    const held = new Set((JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'publish-hold-drivers.json'), 'utf8')).drivers || []).map((e) => e.id));
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const bad = (app.drivers || [])
      .filter((d) => d.zigbee && !(d.zigbee.manufacturerName || []).length && !listed.has(d.id) && !held.has(d.id))
      .map((d) => d.id);
    assert.deepStrictEqual(bad, []);
  });
});
