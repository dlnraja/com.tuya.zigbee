'use strict';
/* eslint-env mocha */
// #105 (Homey news 2026-08-20, export pricing): a driver exposing meter_power.exported must tell
// Homey Energy which capability is exported, otherwise exported kWh is not counted.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('#105 exported energy is declared in the energy object', () => {
  const root = path.join(__dirname, '..', 'drivers');
  for (const d of fs.readdirSync(root)) {
    const p = path.join(root, d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!(j.capabilities || []).includes('meter_power.exported')) continue;
    it(d, () => {
      const e = j.energy || {};
      const exp = e.cumulativeExportedCapability || e.meterPowerExportedCapability;
      assert.strictEqual(exp, 'meter_power.exported');
    });
  }
});
