'use strict';
// WHY(2026-10-11): new driver valve_controller_5zone for the AutomatOn AUT000069 (exact couple
// _TZ3000_j0ktmul1 + TS011F, Z2M automaton.ts + Z2S_Library). Pairing must rest on native ZCL clusters.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = 'valve_controller_5zone';
const dir = path.join(ROOT, 'drivers', D);
const compose = JSON.parse(fs.readFileSync(path.join(dir, 'driver.compose.json'), 'utf8'));
const flow = JSON.parse(fs.readFileSync(path.join(dir, 'driver.flow.compose.json'), 'utf8'));
const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

// 2026-10-11 fold: the driver is held from the Athom payload (AggregateError); its couple ships via
// switch_4gang (5 gangs through GangCountAdapter). The held driver keeps TS011F + 5 native endpoints
// but owns no manufacturerName, so exactly one driver claims _TZ3000_j0ktmul1.
test('held driver: TS011F, native onOff on endpoints 1..5, no couple owned', () => {
  assert.deepEqual(compose.zigbee.productId, ['TS011F']);
  assert.deepEqual(compose.zigbee.manufacturerName, []);
  for (let e = 1; e <= 5; e++) {assert.ok(compose.zigbee.endpoints[e].clusters.includes(6), `EP${e} onOff`);}
});

test('only switch_4gang claims _TZ3000_j0ktmul1', () => {
  const owners = [];
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
    if ((z.manufacturerName || []).some((m) => m.toLowerCase() === '_tz3000_j0ktmul1')) {owners.push(d);}
  }
  assert.deepEqual(owners, ['switch_4gang']);
});

test('device is a 5-gang UnifiedSwitchBase; flow ids match the runtime trigger naming', () => {
  const src = fs.readFileSync(path.join(dir, 'device.js'), 'utf8');
  assert.match(src, /extends UnifiedSwitchBase/);
  assert.match(src, /get gangCount\(\) \{ return 5; \}/);
  const ids = new Set(flow.triggers.map((c) => c.id));
  for (let g = 1; g <= 5; g++) {
    assert.ok(ids.has(`${D}_gang${g}_turned_on`) && ids.has(`${D}_gang${g}_turned_off`));
  }
  for (const c of [...flow.triggers, ...flow.conditions, ...flow.actions]) {
    for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l], `${c.id} ${l}`);}
  }
});

test('app.json carries the driver (cards stay driver-scoped) and images', () => {
  const d = app.drivers.find((x) => x.id === D);
  assert.ok(d && d.zigbee.productId.includes('TS011F'));
  // P2381: driver cards live in driver.flow.compose.json only (homey build merges them)
  const root = [...app.flow.triggers, ...app.flow.conditions, ...app.flow.actions].map((c) => c.id);
  assert.ok(!root.some((id) => id.startsWith(`${D}_`)));
  for (const f of ['assets/images/small.png', 'assets/images/large.png', 'assets/icon.svg']) {assert.ok(fs.existsSync(path.join(dir, f)), f);}
});
