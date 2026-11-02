'use strict';
// P3236 (02/11/2026 Paris): every continuation (DRIVER_CONTINUATIONS.md) gets working listeners on its own
// '<cont>_*' flow cards, generically: device/driver wrap the root with ContinuationFlowAlias.continuationOf,
// and each continuation card id is the naming-rule image of a root card (so the root code's lookups alias to it).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const A = require('../../lib/drivers/ContinuationFlowAlias');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/driver-continuations.json'), 'utf8')).drivers;
const conts = Object.entries(reg).filter(([, e]) => e && e.continuationOf).map(([id, e]) => [id, e.continuationOf]);
const SECTIONS = ['triggers', 'conditions', 'actions'];
const cards = (d) => {
  const p = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
  if (!fs.existsSync(p)) {return {};}
  const f = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Object.fromEntries(SECTIONS.map(s => [s, (f[s] || []).map(c => c.id)]));
};

describe('P3236 continuation flow cards alias to root handlers (generic)', () => {
  it('has at least climate_sensor_2 and curtain_motor_2', () => {
    const ids = conts.map(c => c[0]);
    assert.ok(ids.includes('climate_sensor_2') && ids.includes('curtain_motor_2'));
  });

  for (const [cont, root] of conts) {
    it(`${cont}: device.js and driver.js wrap ${root} with continuationOf`, () => {
      for (const k of ['device', 'driver']) {
        const src = fs.readFileSync(path.join(ROOT, 'drivers', cont, `${k}.js`), 'utf8');
        assert.ok(src.includes('ContinuationFlowAlias') && src.includes(`continuationOf(require('../${root}/${k}'), '${root}', '${cont}')`), `${cont}/${k}.js`);
      }
    });

    it(`${cont}: every own card is the naming-rule image of a ${root} card (same section)`, () => {
      const r = cards(root); const c = cards(cont);
      for (const s of SECTIONS) {
        const want = (r[s] || []).map(id => A.contCardId(id, root, cont)).sort();
        assert.deepStrictEqual((c[s] || []).slice().sort(), want, `${cont} ${s}`);
      }
    });

    it(`${cont}: root code lookups of every ${root} card resolve to the ${cont} card (listener lands there)`, () => {
      const c = cards(cont); const r = cards(root);
      const have = new Set([].concat(...SECTIONS.map(s => c[s] || [])));
      const listened = [];
      const card = (id) => { if (!have.has(id) && !String(id).startsWith(root)) {throw new Error(`Invalid Flow Card ID: ${id}`);} return { id, registerRunListener() { listened.push(id); return this; } }; };
      const flow = { getActionCard: card, getConditionCard: card, getTriggerCard: card, getDeviceTriggerCard: card };
      const p = A.makeFlowProxy(flow, root, cont);
      const getter = { triggers: 'getDeviceTriggerCard', conditions: 'getConditionCard', actions: 'getActionCard' };
      for (const s of SECTIONS) {for (const id of r[s] || []) {p[getter[s]](id).registerRunListener(() => true);}}
      assert.deepStrictEqual(listened.sort(), [...have].sort());
    });

    it(`${cont}: an instance of the wrapped classes gets the aliased flow`, () => {
      const Root = class { constructor(o) { this.homey = o.homey; } };
      const C = A.continuationOf(Root, root, cont);
      const seen = [];
      const homey = { flow: { getConditionCard: (id) => { seen.push(id); if (!String(id).startsWith(cont)) {return { id };} return { id }; } } };
      const inst = new C({ homey });
      inst.homey.flow.getConditionCard(`${root}_x`);
      assert.ok(seen.includes(`${cont}_x`));
    });
  }

  it('naming rule', () => {
    assert.strictEqual(A.contCardId('climate_sensor_temperature_above', 'climate_sensor', 'climate_sensor_2'), 'climate_sensor_2_temperature_above');
    assert.strictEqual(A.contCardId('climate_scene_triggered', 'climate_sensor', 'climate_sensor_2'), 'climate_sensor_2_climate_scene_triggered');
    assert.strictEqual(A.contCardId('climate_sensor_2_x', 'climate_sensor', 'climate_sensor_2'), null);
  });
});
