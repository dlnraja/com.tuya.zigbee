'use strict';

/**
 * Automation couple guard — Contre quoi: bots re-adding curated removals, stripping pinned /
 * sacred couples, shrinking drivers or mfs_db (heobian, vrcfo4i0, HOBEIAN keys, P2613 prune).
 * Runs the real script against a throw-away git repo.
 */
const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'tools/ci/automation-couple-guard.js');
let repo;

const w = (rel, obj) => {
  const p = path.join(repo, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
};
const compose = (mfr, pid) => ({ zigbee: { manufacturerName: mfr, productId: pid } });
const g = (...a) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' });
const run = (...a) => spawnSync(process.execPath, [SCRIPT, ...a], {
  cwd: repo, encoding: 'utf8', env: { ...process.env, GUARD_ROOT: repo },
});
const reset = () => { g('checkout', '-q', '--', '.'); g('clean', '-qfd'); };

describe('automation couple guard', () => {
  before(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'couple-guard-'));
    g('init', '-q');
    g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
    w('config/architecture/couple-driver-pins.json', { pins: [{ mfr: ['_TZE200_aaaaaaaa'], driver: 'drv_a', pid: 'TS0601' }] });
    w('config/architecture/publish-sacred-keep-couples.json', { couples: [{ mfr: '_TZE204_ssssssss', pid: 'TS0601', driverId: 'drv_a' }] });
    w('config/architecture/curated-couple-removals.json', { removals: [{ driver: 'drv_b', mfr: ['_TZE200_dddddddd'] }] });
    w('drivers/drv_a/driver.compose.json', compose(['_TZE200_aaaaaaaa', '_TZE204_ssssssss', '_TZ3000_keep'], ['TS0601', 'TS0001']));
    w('drivers/drv_b/driver.compose.json', compose(['_TZ3000_bbbbbbbb'], ['TS0601', 'TS0203']));
    w('data/mfs_db.json', { HOBEIAN: { driverId: 'multi', modelIds: ['ZG-IR01'] }, _tz3000_cllghx1k: { driverId: 'button_wireless_2', modelIds: ['TS0042'] } });
    g('add', '-A'); g('commit', '-qm', 'base');
  });

  it('clean tree passes', () => {
    const r = run('--check');
    assert.equal(r.status, 0, r.stdout);
  });

  it('growth by a bot is allowed', () => {
    w('drivers/drv_b/driver.compose.json', compose(['_TZ3000_bbbbbbbb', '_TZ3000_new00000'], ['TS0601', 'TS0203']));
    const r = run('--check');
    assert.equal(r.status, 0, r.stdout);
    reset();
  });

  it('PIN_LOST: stripping a pinned couple fails, --revert skips the change', () => {
    w('drivers/drv_a/driver.compose.json', compose(['_TZE204_ssssssss', '_TZ3000_keep'], ['TS0601', 'TS0001']));
    const r = run('--check');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /PIN_LOST/);
    const rv = run('--revert');
    assert.equal(rv.status, 0, rv.stdout);
    const j = JSON.parse(fs.readFileSync(path.join(repo, 'drivers/drv_a/driver.compose.json'), 'utf8'));
    assert.ok(j.zigbee.manufacturerName.includes('_TZE200_aaaaaaaa'));
    reset();
  });

  it('sacred-keep couple counts as a pin (case-insensitive)', () => {
    w('drivers/drv_a/driver.compose.json', compose(['_TZE200_aaaaaaaa', '_TZ3000_keep'], ['TS0601', 'TS0001']));
    assert.match(run('--check').stdout, /PIN_LOST .*_tze204_ssssssss/);
    reset();
  });

  it('PIN_BLEED: pinned couple newly claimed by another driver fails', () => {
    w('drivers/drv_b/driver.compose.json', compose(['_TZ3000_bbbbbbbb', '_tze200_AAAAAAAA'], ['TS0601', 'TS0203']));
    const r = run('--check');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /PIN_BLEED/);
    reset();
  });

  it('DENY_READDED: curated removal coming back fails', () => {
    w('drivers/drv_b/driver.compose.json', compose(['_TZ3000_bbbbbbbb', '_TZE200_dddddddd'], ['TS0601', 'TS0203']));
    const r = run('--check');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /DENY_READDED/);
    reset();
  });

  it('GOLDEN_LOST: any shrink by a bot fails', () => {
    w('drivers/drv_b/driver.compose.json', compose(['_TZ3000_bbbbbbbb'], ['TS0601']));
    assert.match(run('--check').stdout, /GOLDEN_LOST/);
    reset();
  });

  it('MFS_KEY_LOST and MFS_JUNK on data/mfs_db.json', () => {
    w('data/mfs_db.json', { _tz3000_cllghx1k: { driverId: 'button_wireless_2', modelIds: ['TS0042', '01MINIZB'] } });
    const r = run('--check');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /MFS_KEY_LOST/);
    assert.match(r.stdout, /MFS_JUNK/);
    const rv = run('--revert');
    assert.equal(rv.status, 0, rv.stdout);
    assert.ok(JSON.parse(fs.readFileSync(path.join(repo, 'data/mfs_db.json'), 'utf8')).HOBEIAN);
    reset();
  });

  it('real repo rules load and the repo is clean against HEAD', () => {
    const { loadRules } = require(SCRIPT);
    const r = loadRules();
    assert.ok(r.pins.length > 0 && r.deny.length > 0);
    const curated = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/architecture/curated-couple-removals.json'), 'utf8'));
    for (const rem of curated.removals) {
      const c = path.join(ROOT, 'drivers', rem.driver, 'driver.compose.json');
      if (!fs.existsSync(c)) continue;
      const m = JSON.parse(fs.readFileSync(c, 'utf8')).zigbee.manufacturerName.map((x) => x.toLowerCase());
      for (const x of rem.mfr) assert.ok(!m.includes(x.toLowerCase()), `${x} must stay off ${rem.driver}`);
    }
  });

  it('bot workflows run the guard before committing', () => {
    for (const f of ['auto-fix-and-publish.yml', 'safe-sync-stable.yml']) {
      const p = path.join(ROOT, '.github/workflows', f);
      if (!fs.existsSync(p)) continue;
      assert.match(fs.readFileSync(p, 'utf8'), /automation-couple-guard\.js --revert/, f);
    }
  });
});
