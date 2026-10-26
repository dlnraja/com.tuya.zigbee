'use strict';
// P3071b: shared dropdown labels compacted in the publish copy (ids untouched);
// P3071c: HOCH ZJSBL7-100Z RCBO (hkdl5fmv) hoch_din frame decode + late measure_temperature (zhc TS0601_rcbo).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const { compactSharedText, CANON } = require(path.join(ROOT, 'scripts/maintenance/compact-shared-text.cjs'));
const Din = require(path.join(ROOT, 'drivers/energy_meter_din/device.js'));

describe('P3071b shared dropdown labels', () => {
  it('replaces labels only when ids and en labels match, keeps ids and order', () => {
    const src = [{ id: 'auto', label: { en: 'Auto Detect', fr: 'Détection Automatique' } }, { id: 'ac', label: { en: 'AC Powered', fr: 'Alimentation Secteur' } },
      { id: 'dc', label: { en: 'DC Powered', fr: 'Alimentation DC' } }, { id: 'battery', label: { en: 'Battery Powered', fr: 'Sur Batterie' } }];
    const custom = [{ id: 'auto', label: { en: 'Auto' } }, { id: 'ac', label: { en: 'Mains' } }];
    const m = { drivers: [{ id: 'x', settings: [{ id: 'power_source', values: src }, { id: 'battery_type', values: custom }] }] };
    const st = compactSharedText(m);
    assert.strictEqual(st.valuesCanon, 1);
    assert.deepStrictEqual(m.drivers[0].settings[0].values.map((v) => v.id), ['auto', 'ac', 'dc', 'battery']);
    assert.strictEqual(m.drivers[0].settings[0].values[1].label.fr, 'Secteur (AC)');
    assert.deepStrictEqual(m.drivers[0].settings[1].values, custom);
  });
  it('every canon entry is shorter, has en (+fr where translated), same ids as the source app.json', () => {
    const app = require(path.join(ROOT, 'app.json'));
    const real = new Set();
    const walk = (list) => { for (const x of list || []) { if (x.children) {walk(x.children);} else if (Array.isArray(x.values)) {real.add(`${x.id}|${x.values.map((v) => v.id).join()}`);} } };
    for (const drv of app.drivers) {walk(drv.settings);}
    for (const [id, c] of Object.entries(CANON.settingValues)) {
      assert.strictEqual(c.from.length, c.to.length, id);
      const toEn = c.to.reduce((n, v) => n + v.label.en.length, 0);
      assert.ok(toEn <= c.from.join('').length, `${id} en not shorter`);
      assert.ok(!/[├¤]/.test(JSON.stringify(c.to)), id);
      assert.ok(real.has(`${id}|${c.to.map((v) => v.id).join()}`), `${id} matches real settings`);
    }
  });
});

function fake(mfr, caps) {
  const set = {};
  const added = [];
  const d = Object.create(Din.prototype);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null,
    getStore: () => ({}), getData: () => ({}),
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); added.push(c); },
    safeSetCapabilityValue: async (c, v) => { set[c] = v; },
    log: () => {},
  });
  return { d, set, added };
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3071c HOCH RCBO hkdl5fmv (energy_meter_din)', () => {
  it('decodes V/A/W/kWh from the hoch_din frame and adds measure_temperature only on a real report', async () => {
    const caps = new Set(['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power', 'measure_frequency']);
    const { d, set, added } = fake('_TZE200_hkdl5fmv', caps);
    d._handleDP(101, Buffer.from([0x08, 0xfc]));
    d._handleDP(102, Buffer.from([0x00, 0x05, 0xdc]));
    d._handleDP(103, Buffer.from([0x00, 0x0d, 0x7a]));
    d._handleDP(113, 12345);
    d._handleDP(112, Buffer.from([1, 2, 3]));
    await tick();
    assert.deepStrictEqual(set, { measure_voltage: 230, measure_current: 1.5, measure_power: 345, meter_power: 123.45 });
    assert.deepStrictEqual(added, []);
    d._handleDP(105, 41);
    await tick(); await tick();
    assert.deepStrictEqual(added, ['measure_temperature']);
    assert.strictEqual(set.measure_temperature, 41);
  });
  it('exact couples only (TZE200/TZE284), lower case too', () => {
    for (const m of ['_TZE200_hkdl5fmv', '_tze284_hkdl5fmv']) { assert.strictEqual(fake(m, new Set()).d._dinVariant(), 'hoch', m); }
    assert.strictEqual(fake('_TZE204_hkdl5fmv', new Set()).d._dinVariant(), null);
    assert.strictEqual(Din.decodeHoch(105, Buffer.alloc(0)), null);
  });
});
