'use strict';
// P3043b (25/10/2026 Paris): three P3039b/c drivers measure power directly but also declared
// energy.approximation, a Homey Energy v3 conflict (energy-compose-gate, Fleetwood gate and p2692 red).
// They keep their power capabilities; the approximation is gone, in compose and in app.json.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const app = require(path.join(ROOT, 'app.json'));
const IDS = ['energy_meter_3ch_bidirectional', 'gpo_double_light_mg_au03', 'gpo_double_mg_gpo02z'];

describe('P3043b P3039 power drivers have no energy.approximation', () => {
  for (const id of IDS) {
    it(id, () => {
      const c = require(path.join(ROOT, 'drivers', id, 'driver.compose.json'));
      const a = app.drivers.find((d) => d.id === id);
      assert.ok(c.capabilities.includes('measure_power'));
      assert.ok(!(c.energy && c.energy.approximation));
      assert.ok(!(a.energy && a.energy.approximation));
    });
  }
});
