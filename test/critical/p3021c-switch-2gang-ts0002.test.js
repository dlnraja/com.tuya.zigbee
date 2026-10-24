'use strict';
// P3021c: _TZ3000_amal63is + TS0002 (JohanBendz#128) gets a dedicated TS0002-only 2-gang driver.
// Every other TS0002 driver shares TS0012 or other pids with switch_1gang (which already lists the
// mfr), so placing it there produced a dual couple. switch_1gang stays untouched.
require('../_support/homey-stub'); // P3020: stub the SDK shape before homey-zigbeedriver loads
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'switch_2gang_ts0002';
const MFR = '_tz3000_amal63is';
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const hasMfr = (z) => (z.manufacturerName || []).some((x) => String(x).toLowerCase() === MFR);
const pids = (z) => [...new Set((z.productId || []).map((x) => String(x).toUpperCase()))];

function composeDrivers() {
  const out = {};
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join('drivers', d, 'driver.compose.json');
    if (!fs.existsSync(path.join(ROOT, p))) { continue; }
    const z = readJson(p).zigbee;
    if (z) { out[d] = z; }
  }
  return out;
}

describe('P3021c switch_2gang_ts0002', () => {
  it('is TS0002 only, caseless amal63is, no 0xEF00 endpoint', () => {
    const z = readJson(`drivers/${ID}/driver.compose.json`).zigbee;
    assert.deepStrictEqual(z.productId, ['TS0002']);
    for (const f of ['_TZ3000_amal63is', '_tz3000_amal63is', '_TZ3000_AMAL63IS']) { assert.ok(z.manufacturerName.includes(f), f); }
    for (const ep of Object.values(z.endpoints)) { assert.ok(!ep.clusters.includes(61184), 'no EF00 at pairing'); }
  });

  it('each amal63is couple has exactly one owner, TS0002 -> this driver, TS0012 stays on switch_1gang', () => {
    const owners = {};
    for (const [d, z] of Object.entries(composeDrivers())) {
      if (!hasMfr(z)) { continue; }
      for (const p of pids(z)) { (owners[p] = owners[p] || []).push(d); }
    }
    for (const [p, list] of Object.entries(owners)) { assert.strictEqual(list.length, 1, `${p}: ${list}`); }
    assert.deepStrictEqual(owners.TS0002, [ID]);
    assert.deepStrictEqual(owners.TS0012, ['switch_1gang']);
  });

  it('app.json mirrors the compose entry', () => {
    const app = readJson('app.json');
    const e = app.drivers.find((d) => d.id === ID);
    assert.ok(e, 'driver in app.json');
    assert.deepStrictEqual(pids(e.zigbee), ['TS0002']);
    assert.ok(hasMfr(e.zigbee));
    const owners = app.drivers.filter((d) => d.zigbee && hasMfr(d.zigbee) && pids(d.zigbee).includes('TS0002')).map((d) => d.id);
    assert.deepStrictEqual(owners, [ID]);
  });

  it('reuses the wall_switch_2gang_1way runtime and declares every flow card its driver registers', () => {
    assert.strictEqual(require(`../../drivers/${ID}/device`), require('../../drivers/wall_switch_2gang_1way/device'));
    const flow = readJson(`drivers/${ID}/driver.flow.compose.json`);
    const declared = new Set(Object.values(flow).flat().map((c) => c.id));
    const src = fs.readFileSync(path.join(ROOT, 'drivers', ID, 'driver.js'), 'utf8');
    assert.ok(declared.has(`${ID}_is_on`));
    for (const g of [1, 2]) {
      for (const a of ['turn_on', 'turn_off', 'toggle']) { assert.ok(declared.has(`${ID}_${a}_gang${g}`)); }
      assert.ok(declared.has(`${ID}_physical_gang${g}_on`));
    }
    assert.ok(!src.includes('wall_switch_2gang_1way_'), 'own prefix only');
    for (const id of declared) { assert.ok(id.startsWith(`${ID}_`), id); }
  });

  it('driver registers its flow cards against a stub flow manager', async () => {
    const Driver = require(`../../drivers/${ID}/driver`);
    const seen = [];
    const card = { registerRunListener: () => card };
    const d = Object.create(Driver.prototype);
    d.homey = { flow: { getActionCard: (id) => { seen.push(id); return card; }, getConditionCard: (id) => { seen.push(id); return card; }, getDeviceTriggerCard: () => card } };
    d.log = () => {}; d.error = () => {};
    d._registerFlowCards();
    assert.ok(seen.includes(`${ID}_turn_on_gang2`));
    assert.ok(seen.includes(`${ID}_is_on`));
  });
});
