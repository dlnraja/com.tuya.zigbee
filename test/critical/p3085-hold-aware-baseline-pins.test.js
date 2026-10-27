'use strict';
const { describe, it } = require('../_support/dual-runner');
/**
 * P3085 (27/10/2026): #3684 v9.0.1602 and #3685 v9.0.1603 both failed AggregateError. The offline
 * diff of the 1603 payload vs Test #3682 v9.0.1599 found no structural defect; the 6 never-published
 * pairable ids left by P3084 are the only driver-set change common to both failures. They carry
 * couples moved off published drivers, so they are held AND compaction now ignores held drivers as
 * couple owners: a moved Test couple falls back on the Test driver that shipped it.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { effectiveHoldIds } = require('../../scripts/publish-hold-release');
const czi = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');

const ROOT = path.join(__dirname, '..', '..');
const hold = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'publish-hold-drivers.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'athom-test-9.0.1574-driver-ids.json'), 'utf8'));
const P3085 = ['air_conditioner_aetz01', 'co_sensor_dcr_co', 'fan_light_tuya_5_levels',
  'motion_sensor_excellux_zg104plv', 'smoke_sensor_ts0601_dp', 'vibration_sensor_excellux_zg103v'];

function drv(id, mfrs, pids) {
  return { id, zigbee: { manufacturerName: mfrs, productId: pids } };
}

describe('P3085 hold the 6 moved-couple new ids, re-pin their Test couples', () => {
  it('the six are held with a P3085 reason and were never published', () => {
    const { ids } = effectiveHoldIds(hold, '');
    for (const id of P3085) {
      assert.ok(ids.has(id), `${id} not held`);
      assert.ok(!base.ids.includes(id), `${id} was published`);
      const e = hold.drivers.find((d) => d.id === id);
      assert.ok(/P3085/.test(e.reason) && /#3685/.test(e.reason), id);
    }
  });
  it('resolveBaselinePins skips held owners and restores on the Test driver', () => {
    const manifest = { drivers: [drv('old', ['_TZE200_keep'], ['TS0601']), drv('newid', ['_TZE200_moved'], ['TS0601'])] };
    const baseline = { drivers: { old: { m: ['_TZE200_keep', '_TZE200_moved'], p: ['TS0601'] } } };
    const free = czi.resolveBaselinePins(manifest, baseline);
    assert.ok(free.pins.some((p) => p.mfr === '_TZE200_moved' && p.driverId === 'newid'));
    const held = czi.resolveBaselinePins(manifest, baseline, new Set(['newid']));
    assert.ok(held.pins.some((p) => p.mfr === '_TZE200_moved' && p.driverId === 'old'));
    assert.ok(!held.pins.some((p) => p.driverId === 'newid'));
    assert.deepStrictEqual(held.unresolved, []);
  });
  it('compaction injects the moved couple back on the Test driver when its new owner is held', () => {
    const manifest = { id: 'x', drivers: [drv('old', ['_TZE200_keep'], ['TS0601']), drv('newid', ['_TZE200_moved'], ['TS0601'])] };
    const baseline = { drivers: { old: { m: ['_TZE200_keep', '_TZE200_moved'], p: ['TS0601'] } } };
    czi.compactZigbeeIdentifiers(manifest, { baseline, holdIds: new Set(['newid']), sacredKeep: [], mfsDb: null });
    const old = manifest.drivers.find((d) => d.id === 'old');
    assert.ok(old.zigbee.manufacturerName.includes('_TZE200_moved'));
  });
  it('a restore that would rebuild exempted parasites goes to a clean published driver', () => {
    const manifest = { drivers: [drv('plug', ['_TZ3000_x'], ['TS0601', 'TS011F']),
      drv('box', ['_tze200_air'], ['TS0601']), drv('newid', ['_TZE200_AIR'.replace('AIR', 'air')], ['TS0601'])] };
    const baseline = { drivers: { plug: { m: ['_TZ3000_x', '_TZE200_air'], p: ['TS0601', 'TS011F'] },
      box: { m: ['_tze200_air'], p: ['TS0601'] } },
    exemptions: [{ mfr: '_TZE200_air', pid: 'TS011F', driverId: 'plug', reason: 'P3055 parasite' }] };
    const r = czi.resolveBaselinePins(manifest, baseline, new Set(['newid']));
    const pin = r.pins.find((p) => p.mfr === '_TZE200_air' && p.pid === 'TS0601');
    assert.strictEqual(pin.driverId, 'box');
    assert.deepStrictEqual(r.unresolved, []);
  });
  it('the P3024b source gate keeps every Test couple with the six held', () => {
    const { sourceToPayload, checkBaseline } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
    const appJson = path.join(ROOT, 'app.json');
    if (!fs.existsSync(appJson)) return;
    const view = sourceToPayload(JSON.parse(fs.readFileSync(appJson, 'utf8')), ROOT);
    for (const id of P3085) assert.ok(!view.drivers.some((d) => d.id === id), `${id} in payload`);
    const r = checkBaseline(view, czi.loadPublishBaseline(ROOT));
    assert.deepStrictEqual(r.missing, []);
    // _TZE200_7bztmfm1 (Z2M TS0601_smart_CO_air_box) lands on smart_air_detection_box, not on the plug.
    const own = (m) => view.drivers.filter((d) => d.zigbee && (d.zigbee.manufacturerName || []).includes(m)
      && (d.zigbee.productId || []).includes('TS0601')).map((d) => d.id);
    assert.deepStrictEqual(own('_TZE200_7bztmfm1'), ['smart_air_detection_box']);
    assert.ok(!own('_TZE200_7bztmfm1').includes('device_air_purifier_plug'));
  });
});
