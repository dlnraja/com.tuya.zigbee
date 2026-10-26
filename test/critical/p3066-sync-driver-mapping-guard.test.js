'use strict';
// P3066: the P52 master → stable-v5 sync must keep the target branch's composed driver for a couple
// when master maps it elsewhere (regressions: _TZE284_la2c2uo9 twice, last 6897a290f5 2026-10-26).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const GUARD = path.join(ROOT, 'tools/ci/sync-driver-mapping-guard.js');
const { guardRows } = require(GUARD);

const owners = new Map([
  ['_tze284_la2c2uo9|ts0601', new Set(['dimmer_1_gang_tuya'])],
  ['_tze200_new1|ts0601', new Set(['soil_sensor'])],
  ['_tze200_amb|ts0601', new Set(['a', 'b'])],
]);
const row = (d) => ({ driverId: d, type: d, modelIds: ['TS0601'] });

describe('P3066 sync driver-mapping guard', () => {
  it('restores the target row when the sync points a composed couple elsewhere', () => {
    const base = { _TZE284_la2c2uo9: row('dimmer_1_gang_tuya') };
    const { data, fixes } = guardRows({ _TZE284_la2c2uo9: row('wall_dimmer_tuya') }, base, owners);
    assert.equal(data._TZE284_la2c2uo9.driverId, 'dimmer_1_gang_tuya');
    assert.equal(fixes[0].how, 'restored');
  });
  it('retargets a new row to the single composed owner, keeps master extra fields', () => {
    const { data } = guardRows({ _TZE200_new1: { ...row('climate_sensor'), source: 'z2m' } }, {}, owners);
    assert.deepEqual(data._TZE200_new1, { driverId: 'soil_sensor', type: 'soil_sensor', modelIds: ['TS0601'], source: 'z2m' });
  });
  it('drops a new row when the target owner is ambiguous and nothing existed before', () => {
    const { data } = guardRows({ _TZE200_amb: row('c') }, {}, owners);
    assert.ok(!('_TZE200_amb' in data));
  });
  it('leaves agreeing rows, uncomposed couples and untouched legacy rows alone', () => {
    const legacy = { _TZE284_la2c2uo9: row('legacy_alias') };
    const synced = { ...legacy, _TZE200_new1: row('soil_sensor'), _TZ3000_free: row('anything') };
    const { data, fixes } = guardRows(synced, legacy, owners);
    assert.deepEqual(fixes, []);
    assert.deepEqual(data, synced);
  });
  it('CLI: --check fails on a conflicting tree, fix mode repairs it and keeps one-line JSON', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3066-'));
    const git = (...a) => spawnSync('git', a, { cwd: d, encoding: 'utf8' });
    fs.mkdirSync(path.join(d, 'drivers/dimmer_1_gang_tuya'), { recursive: true });
    fs.mkdirSync(path.join(d, 'lib/tuya'), { recursive: true });
    fs.writeFileSync(path.join(d, 'drivers/dimmer_1_gang_tuya/driver.compose.json'),
      JSON.stringify({ zigbee: { manufacturerName: ['_TZE284_la2c2uo9'], productId: ['TS0601'] } }));
    const fp = path.join(d, 'lib/tuya/fingerprints.json');
    fs.writeFileSync(fp, JSON.stringify({ _TZE284_la2c2uo9: row('dimmer_1_gang_tuya') }));
    git('init', '-q'); git('add', '.');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base');
    fs.writeFileSync(fp, JSON.stringify({ _TZE284_la2c2uo9: row('wall_dimmer_tuya') }));
    const run = (...a) => spawnSync(process.execPath, [GUARD, ...a], { cwd: d, encoding: 'utf8' });
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    const out = fs.readFileSync(fp, 'utf8');
    assert.ok(!out.includes('\n'));
    assert.equal(JSON.parse(out)._TZE284_la2c2uo9.driverId, 'dimmer_1_gang_tuya');
  });
});
