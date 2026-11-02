'use strict';
// P3238: CI gate — a NEW driver with the same class+capabilities as an existing one fails, except
// registered continuations and publish-hold drivers; existing duplicates are baselined.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const gate = require('../../scripts/ci/driver-signature-dup-gate');

function repo(drivers, extra = {}) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'p3238-'));
  for (const [id, c] of Object.entries(drivers)) {
    fs.mkdirSync(path.join(r, 'drivers', id), { recursive: true });
    fs.writeFileSync(path.join(r, 'drivers', id, 'driver.compose.json'), JSON.stringify(c));
  }
  fs.mkdirSync(path.join(r, 'config', 'ci'), { recursive: true });
  fs.writeFileSync(path.join(r, 'config', 'ci', 'b.json'), JSON.stringify({ drivers: extra.baseline || [] }));
  if (extra.hold) {fs.writeFileSync(path.join(r, 'config', 'publish-hold-drivers.json'), JSON.stringify({ drivers: extra.hold.map((id) => ({ id })) }));}
  return r;
}
const S = { class: 'sensor', capabilities: ['alarm_contact', 'measure_battery'] };

describe('P3238 driver signature duplicate gate', () => {
  it('the real repo passes against its baseline', () => {
    assert.deepStrictEqual(gate.check(), []);
  });
  it('rejects a new driver identical (class+caps, any order) to an existing one', () => {
    const r = repo({ a: S, b: { class: 'sensor', capabilities: ['measure_battery', 'alarm_contact'] } }, { baseline: [] });
    const v = gate.check(r, path.join(r, 'config/ci/b.json'));
    assert.strictEqual(v.length, 1);
  });
  it('accepts baselined duplicates, different caps, and publish-hold drivers', () => {
    const r = repo({ a: S, b: S, c: { class: 'sensor', capabilities: ['alarm_contact'] }, h: S }, { baseline: ['a', 'b'], hold: ['h'] });
    assert.deepStrictEqual(gate.check(r, path.join(r, 'config/ci/b.json')), []);
  });
  it('exempts registered continuations of this repo', () => {
    const ex = gate.exemptions(path.join(__dirname, '..', '..'));
    assert.ok(ex.has('curtain_motor_2') || !fs.existsSync(path.join(__dirname, '..', '..', 'drivers', 'curtain_motor_2')));
  });
});
