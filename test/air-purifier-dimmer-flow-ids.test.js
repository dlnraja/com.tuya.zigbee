'use strict';
// Guards the air_purifier_dimmer trigger list against id drift (double "dimmer_" prefix bug).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('air_purifier_dimmer flow trigger ids', () => {
  it('every registered trigger id exists in driver.flow.compose.json', () => {
    const dir = path.join(__dirname, '..', 'drivers', 'air_purifier_dimmer');
    const flow = JSON.parse(fs.readFileSync(path.join(dir, 'driver.flow.compose.json'), 'utf8'));
    const known = new Set((flow.triggers || []).map((t) => t.id));
    const src = fs.readFileSync(path.join(dir, 'driver.js'), 'utf8');
    const m = src.match(/const _triggerIds = (\[.*\]);/);
    assert.ok(m, 'trigger list found');
    const ids = JSON.parse(m[1]);
    assert.deepStrictEqual(ids.filter((i) => !known.has(i)), []);
    assert.ok(!/air_purifier_dimmer_dimmer_/.test(src));
  });
});
