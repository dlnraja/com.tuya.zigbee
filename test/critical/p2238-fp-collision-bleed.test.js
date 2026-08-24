'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2238 FP collision bleed prune', () => {
  it('7dcddnye on dimmer_wall_1gang only (not bulb_dimmable)', () => {
    const fs = require('fs');
    const path = require('path');
    const has = (j, mfr) => (j.zigbee?.manufacturerName || []).some((m) => String(m).toLowerCase() === mfr.toLowerCase());
    const dim = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'dimmer_wall_1gang', 'driver.compose.json'), 'utf8'));
    const bulb = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'bulb_dimmable', 'driver.compose.json'), 'utf8'));
    assert.strictEqual(has(dim, '_TZ3000_7dcddnye'), true);
    assert.strictEqual(has(bulb, '_TZ3000_7dcddnye'), false);
  });

  it('prune gate: zero NEW collisions vs baseline', () => {
    const { execSync } = require('child_process');
    const path = require('path');
    const root = path.join(__dirname, '..', '..');
    const out = execSync('node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json --json', {
      cwd: root,
      encoding: 'utf8',
    });
    const j = JSON.parse(out);
    assert.strictEqual(j.new, 0, `expected 0 NEW collisions, got ${j.new}`);
  });

  it('HOBEIAN brand alias stays on soil_sensor (multi-driver OEM — P2238 regression)', () => {
    const fs = require('fs');
    const path = require('path');
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'soil_sensor', 'driver.compose.json'), 'utf8'));
    const mfrs = (j.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes('hobeian'), 'soil_sensor must retain HOBEIAN for ZG-303Z sacred couple');
    const pids = (j.zigbee?.productId || []).map((p) => String(p));
    assert.ok(pids.includes('ZG-303Z'), 'soil_sensor must list ZG-303Z productId');
  });
});
