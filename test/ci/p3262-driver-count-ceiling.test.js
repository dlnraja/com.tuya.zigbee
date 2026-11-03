'use strict';
// P3262: driver-count ceiling gate (observed Athom refusal above last-accepted count).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const g = require('../../scripts/ci/driver-count-ceiling-gate.js');

const root = path.join(__dirname, '..', '..');
const app = (id, n) => ({ id, drivers: Array.from({ length: n }, (_, i) => ({ id: `d${i}` })) });

describe('P3262 driver-count ceiling', () => {
  const cfg = g.loadConfig();
  it('records master 347, ticket 157057, unconfirmed status', () => {
    assert.strictEqual(cfg.apps['com.dlnraja.tuya.zigbee'].lastAccepted, 347);
    assert.strictEqual(cfg.athomTicket, '157057');
    assert.match(cfg.status, /unconfirmed by Athom/);
  });
  it('passes at the ceiling and warns above it on master', () => {
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee', 347), cfg, 'master').level, 'ok');
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee', 348), cfg, 'master').level, 'warn');
  });
  it('fails above the ceiling on stable-v5 and bastien-home', () => {
    const s = cfg.apps['com.dlnraja.tuya.zigbee.stable'].lastAccepted;
    const b = cfg.apps['com.dlnraja.tuya.zigbee.bastien'].lastAccepted;
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee.stable', s + 1), cfg, 'stable-v5').level, 'fail');
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee.bastien', b + 1), cfg, 'bastien-home').level, 'fail');
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee.stable', s), cfg).level, 'ok');
  });
  it('uses Athom API count + offset when given (345 + 2 = 347 on master)', () => {
    const e = cfg.apps['com.dlnraja.tuya.zigbee'];
    assert.strictEqual(e.athomApiCount + e.apiOffset, e.lastAccepted);
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee', 347), cfg, 'master', 345).level, 'ok');
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee', 348), cfg, 'master', 345).level, 'warn');
    assert.strictEqual(g.evaluate(app('com.dlnraja.tuya.zigbee.stable', 343), cfg, 'stable-v5', 341).level, 'fail');
  });
  it('counts unique driver ids (one-for-one swap keeps the count)', () => {
    const a = app('com.dlnraja.tuya.zigbee', 347);
    a.drivers[0] = { id: 'water_leak_aoyan_ay222z' };
    assert.strictEqual(g.countDrivers(a), 347);
    assert.strictEqual(g.countDrivers({ drivers: [{ id: 'x' }, { id: 'x' }] }), 1);
  });
  it('is wired after payload-preflight in the bastien-home publish workflow, and the rule is documented', () => {
    assert.match(fs.readFileSync(path.join(root, '.github/workflows/bastien-publish.yml'), 'utf8'), /driver-count-ceiling-gate\.js/);
    const doc = fs.readFileSync(path.join(root, 'docs/rules/DRIVER_COUNT_CEILING.md'), 'utf8');
    for (const k of ['observed, unconfirmed by Athom', '157057', 'one-for-one', 'continuation', 'water_leak_aoyan_ay222z']) assert.ok(doc.includes(k), k);
    assert.match(fs.readFileSync(path.join(root, 'CORE_RULES.md'), 'utf8'), /Driver-count ceiling/);
    assert.ok(fs.existsSync(path.join(root, 'config/architecture/driver-count-ceiling-ssot.json')));
  });
});
