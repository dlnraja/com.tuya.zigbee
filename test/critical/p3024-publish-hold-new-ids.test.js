'use strict';
const { describe, it } = require('../_support/dual-runner');
/**
 * P3024 (25/10/2026): master AggregateError since v9.0.1575. Attempt 1 holds back every driver id that
 * is not in the last accepted Test build (#3655 v9.0.1574). Guards:
 *  - every held entry is a real source driver with a reason;
 *  - a held id was never published (not in the 1574 fixture), so no paired device loses its driver;
 *  - effectiveHoldIds holds them, and release_held frees one id only (bisect one id per dispatch);
 *  - a held id is never also graduated or folded.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { effectiveHoldIds } = require('../../scripts/publish-hold-release');

const ROOT = path.join(__dirname, '..', '..');
const hold = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'publish-hold-drivers.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'athom-test-9.0.1574-driver-ids.json'), 'utf8'));
const published = new Set(base.ids);
const P3024 = ['heiman_keyfob', 'heiman_siren', 'presence_radar_aoyan_ay204t', 'sauna_thermostat_ae5503',
  'siren_moes_mg_bjq002', 'switch_2gang_ts0002', 'switch_wall_6gang_metering', 'valve_novato_zpv01',
  'water_leak_aoyan_ay222z', 'water_leak_blitzwolf_bw_is9'];

describe('P3024 publish hold of never-published master driver ids', () => {
  it('1574 fixture looks like the real Test build', () => {
    assert.ok(base.ids.length >= 300);
    assert.ok(published.has('button_emergency_sos'));
  });
  it('every held entry has an id, a reason and a source driver', () => {
    for (const e of hold.drivers) {
      assert.ok(e.id && typeof e.reason === 'string' && e.reason.length > 20, JSON.stringify(e));
      assert.ok(fs.existsSync(path.join(ROOT, 'drivers', e.id, 'driver.compose.json')), `${e.id} missing in source`);
    }
  });
  it('no held id was ever in Test 1574 (never-published only)', () => {
    const bad = hold.drivers.map((e) => e.id).filter((id) => published.has(id));
    assert.deepStrictEqual(bad, []);
  });
  it('held ids are not graduated or folded at the same time', () => {
    const other = new Set([...Object.keys(hold._graduated || {}), ...Object.keys(hold._folded || {})]);
    assert.deepStrictEqual(hold.drivers.map((e) => e.id).filter((id) => other.has(id)), []);
  });
  it('the P3024 group is held, and release_held frees one id only', () => {
    const { ids } = effectiveHoldIds(hold, '');
    for (const id of P3024) if (fs.existsSync(path.join(ROOT, 'drivers', id))) assert.ok(ids.has(id), id);
    const r = effectiveHoldIds(hold, 'heiman_siren');
    assert.deepStrictEqual(r.released, ['heiman_siren']);
    assert.ok(!r.ids.has('heiman_siren') && r.ids.has('heiman_keyfob'));
  });
});
