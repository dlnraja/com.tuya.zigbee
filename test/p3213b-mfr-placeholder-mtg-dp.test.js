/* eslint-env mocha */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
describe('P3213b manifest placeholder mfr never persisted + MTG DP113/115/116 sourced', () => {
  const { ensureManufacturerSettings } = require('../lib/helpers/ManufacturerNameHelper');
  const mk = (settings, data, node) => {
    const writes = [];
    return { writes, getSetting: (k) => settings[k], getSettings: () => settings, getStoreValue: () => undefined,
      getData: () => data, node, log() {}, setSettings: async (u) => { writes.push(u); Object.assign(settings, u); },
      driver: { manifest: { zigbee: { manufacturerName: ['_TZE200_pay2byax'], productId: ['TS0203'] } } } };
  };
  it('does not write manifest[0] when the device identity is unknown (Peter c05db40d)', async () => {
    const d = mk({}, {}, {});
    await ensureManufacturerSettings(d);
    assert.ok(!d.writes.some((w) => w.zb_manufacturer_name === '_TZE200_pay2byax'));
  });
  it('heals a poisoned setting from the real interview identity', async () => {
    const d = mk({ zb_manufacturer_name: '_TZE200_pay2byax' }, { manufacturerName: '_TZ3000_26fmupbb' }, {});
    await ensureManufacturerSettings(d);
    assert.strictEqual(d.writes.pop().zb_manufacturer_name, '_TZ3000_26fmupbb');
  });
  it('keeps a real pay2byax identity', async () => {
    const d = mk({}, { manufacturerName: '_TZE200_pay2byax', productId: 'TS0601' }, {});
    await ensureManufacturerSettings(d);
    assert.strictEqual(d.writes.pop().zb_manufacturer_name, '_TZE200_pay2byax');
  });
  it('MTG DP113/115/116 guarded with Z2M semantics before the siren context map', () => {
    const src = fs.readFileSync(path.join(__dirname, '../lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.ok(src.includes('P3213-MTG') && src.includes('mtg_distance_report') && src.includes("'occupied', 'unoccupied'"));
    assert.ok(src.indexOf('P3213-MTG') < src.indexOf('const contextMapping = getContextualDpMapping'));
  });
});
