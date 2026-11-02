'use strict';
// P3233: curtain_motor_2 continuation (zero-parasite packing) — exact moved couples, held, own flow ids
// aliased to the root code, and the continuation flow alias resolves '<root>_x' to '<cont>_x' only when it exists.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const DC = require('../../lib/drivers/DriverContinuations');
const { aliasId, install } = require('../../lib/drivers/ContinuationFlowAlias');
const j = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const lc = (s) => String(s).toLowerCase();

describe('P3233 curtain_motor_2 continuation', () => {
  const root = j('drivers/curtain_motor/driver.compose.json');
  const cont = j('drivers/curtain_motor_2/driver.compose.json');

  it('registry links curtain_motor -> curtain_motor_2 and it is held', () => {
    DC.clearCache(); const reg = DC.load(ROOT);
    assert.strictEqual(reg.rootOf('curtain_motor_2'), 'curtain_motor');
    assert.ok(j('config/publish-hold-drivers.json').drivers.some((d) => d.id === 'curtain_motor_2'));
  });

  it('carries exactly the 2 sourced TS0601-only makers, TS0601 only, none left on the root', () => {
    assert.deepStrictEqual([...new Set(cont.zigbee.manufacturerName.map(lc))].sort(), ['_tze200_cpbo62rn', '_tze200_eegnwoyw']);
    assert.deepStrictEqual([...new Set(cont.zigbee.productId.map(lc))], ['ts0601']);
    const rm = new Set(root.zigbee.manufacturerName.map(lc));
    assert.ok(!rm.has('_tze200_cpbo62rn') && !rm.has('_tze200_eegnwoyw'));
  });

  it('same capabilities/class as root, own images and flow ids', () => {
    assert.deepStrictEqual(cont.capabilities, root.capabilities);
    assert.strictEqual(cont.class, root.class);
    assert.ok(cont.images.small.includes('/curtain_motor_2/'));
    const ids = (f) => JSON.stringify(j(f)).match(/"id":"curtain_motor[^"]*"/g) || [];
    const ri = ids('drivers/curtain_motor/driver.flow.compose.json');
    const ci = ids('drivers/curtain_motor_2/driver.flow.compose.json');
    assert.strictEqual(ci.length, ri.length);
    assert.ok(ci.every((s) => s.startsWith('"id":"curtain_motor_2_')));
  });

  it('alias maps root card ids to the continuation card only when it exists', () => {
    const has = (id) => id === 'curtain_motor_2_open';
    assert.strictEqual(aliasId('curtain_motor_open', 'curtain_motor', 'curtain_motor_2', has), 'curtain_motor_2_open');
    assert.strictEqual(aliasId('curtain_motor_close', 'curtain_motor', 'curtain_motor_2', has), 'curtain_motor_close');
    assert.strictEqual(aliasId('other_open', 'curtain_motor', 'curtain_motor_2', has), 'other_open');
  });

  it('install proxies homey.flow lookups on the instance (failsafe)', () => {
    const asked = [];
    const flow = { getActionCard: (id) => { asked.push(id); if (id !== 'curtain_motor_2_open' && id !== 'curtain_motor_open') {throw new Error('nf');} return { id }; } };
    const inst = { homey: { flow, x: 1 } };
    assert.ok(install(inst, 'curtain_motor', 'curtain_motor_2'));
    assert.strictEqual(inst.homey.flow.getActionCard('curtain_motor_open').id, 'curtain_motor_2_open');
    assert.strictEqual(inst.homey.x, 1);
    assert.strictEqual(install({}, 'a', 'b'), false);
  });
});

describe('P3233 size-gate projection drops held drivers like prepare-publish', () => {
  const { dropHeld } = require('../../scripts/publish-hold-release');
  it('drops held drivers and cards filtered only on held drivers, keeps shared cards', () => {
    const m = { drivers: [{ id: 'a' }, { id: 'h' }], flow: { actions: [
      { id: 'x', args: [{ type: 'device', filter: 'driver_id=h' }] },
      { id: 'y', args: [{ type: 'device', filter: 'driver_id=a|h' }] },
      { id: 'z' },
    ] } };
    assert.deepStrictEqual(dropHeld(m, new Set(['h'])), { drivers: 1, cards: 1 });
    assert.deepStrictEqual(m.drivers.map((d) => d.id), ['a']);
    assert.deepStrictEqual(m.flow.actions.map((c) => c.id), ['y', 'z']);
  });
  it('publish-size-gate uses dropHeld', () => {
    assert.ok(fs.readFileSync(path.join(ROOT, 'scripts/ci/publish-size-gate.cjs'), 'utf8').includes('dropHeld'));
  });
});
