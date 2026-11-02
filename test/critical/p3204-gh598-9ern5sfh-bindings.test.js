'use strict';
// WHY(P3204, GH#598): "_TZE284_9ern5sfh" + TS0601 failed pairing with "Unable to connect" although the couple was listed.
// Homey sends one bind request per manifest `bindings` entry during pairing (Homey Apps SDK, Zigbee > Manifest).
// The node only serves 0, 4, 5, 0xED00, 0xEF00 (interview in GH#598 and forum 140352 #2263) but lcdtemphumidsensor
// binds 1/1026/1029. Owner is now lcdtemphumidsensor_3, whose bindings all exist on the node.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const NODE_IN = [0, 4, 5, 60672, 61184]; // GH#598 interview, endpoint 1 inputClusters

function driversFor(manifestDrivers, mfr) {
  return manifestDrivers.filter((d) => [].concat(d.zigbee?.manufacturerName || []).includes(mfr)
    && [].concat(d.zigbee?.productId || []).includes('TS0601'));
}

describe('P3204 GH#598 9ern5sfh pairs on a driver whose bindings the node serves', () => {
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  it('exactly one owner in app.json and every manifest binding exists on the node', () => {
    const owners = driversFor(app.drivers, '_TZE284_9ern5sfh');
    assert.deepEqual(owners.map((d) => d.id), ['lcdtemphumidsensor_3']);
    for (const [ep, def] of Object.entries(owners[0].zigbee.endpoints)) {
      assert.equal(ep, '1');
      for (const b of def.bindings || []) assert.ok(NODE_IN.includes(b), `binding ${b} not served by the node`);
    }
  });
  it('the old driver no longer lists any 9ern5sfh form (compose + app.json)', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/lcdtemphumidsensor/driver.compose.json'), 'utf8'));
    assert.ok(!c.zigbee.manufacturerName.some((m) => /9ern5sfh/i.test(m)));
    const a = app.drivers.find((d) => d.id === 'lcdtemphumidsensor');
    assert.ok(!a.zigbee.manufacturerName.some((m) => /9ern5sfh/i.test(m)));
  });
  it('sacred-keep and curated removal follow the move', () => {
    const sk = fs.readFileSync(path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8');
    assert.match(sk, /"mfr": "_TZE284_9ern5sfh",\s*"pid": "TS0601",\s*"driverId": "lcdtemphumidsensor_3"/);
    const rem = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/curated-couple-removals.json'), 'utf8')).removals;
    assert.ok(rem.some((r) => r.driver === 'lcdtemphumidsensor' && r.mfr.includes('_TZE284_9ern5sfh')));
  });
});
