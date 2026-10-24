'use strict';

/**
 * P3019d — Bastien→master/stable promote is three-way (merge-base / target / Bastien):
 * only what Bastien changed since the merge-base is promoted, both-sided changes go through
 * git merge-file, conflicts are skipped and reported, target-only lines/entries are never dropped.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TW = require('../../tools/ci/three-way-promote');
const P = require('../../tools/ci/bastien-promote-upstream');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'p3019d-'));
}
function write(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}
const compose = (mfr, pid, caps = ['onoff'], extra = {}) => `${JSON.stringify({ id: 'x', capabilities: caps, zigbee: { manufacturerName: mfr, productId: pid }, ...extra }, null, 2)}\n`;
/** fake io: base / theirs come from maps, ours from the worktree. */
function io(root, base, theirs) {
  return {
    readAt: (_r, rev, rel) => (rev === 'BASE' ? base : theirs)[rel] ?? null,
    readWorktree: TW.readWorktree,
  };
}

describe('P3019d decideThreeWay', () => {
  it('take: only Bastien changed since the base', () => {
    assert.deepEqual(TW.decideThreeWay({ base: 'a\n', ours: 'a\n', theirs: 'a\nb\n' }), { action: 'take', text: 'a\nb\n' });
  });
  it('target_ahead: Bastien unchanged since the base, target moved on → never overwrite', () => {
    assert.equal(TW.decideThreeWay({ base: 'a\n', ours: 'a\nM\n', theirs: 'a\n' }).reason, 'target_ahead');
  });
  it('identical / missing_on_bastien (never delete) / create / deleted_on_target', () => {
    assert.equal(TW.decideThreeWay({ base: 'a', ours: 'b', theirs: 'b\n' }).reason, 'identical');
    assert.equal(TW.decideThreeWay({ base: 'a', ours: 'a', theirs: null }).reason, 'missing_on_bastien');
    assert.equal(TW.decideThreeWay({ base: null, ours: null, theirs: 'n' }).action, 'create');
    assert.equal(TW.decideThreeWay({ base: 'a', ours: null, theirs: 'b' }).reason, 'deleted_on_target');
  });
  it('merge: both sides changed different hunks → git merge-file keeps the master line', () => {
    const base = 'l1\nl2\nl3\nl4\nl5\nl6\nl7\n';
    const ours = 'l1\nM\nl2\nl3\nl4\nl5\nl6\nl7\n';
    const theirs = 'l1\nl2\nl3\nl4\nl5\nl6\nB\nl7\n';
    const d = TW.decideThreeWay({ base, ours, theirs });
    assert.equal(d.action, 'merge');
    assert.ok(d.text.includes('M\n') && d.text.includes('B\n'));
  });
  it('conflict_skipped: both sides changed the same line', () => {
    const d = TW.decideThreeWay({ base: 'a\nx\nb\n', ours: 'a\nM\nb\n', theirs: 'a\nB\nb\n' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'conflict_skipped');
    assert.ok(d.conflicts >= 1);
  });
  it('would_drop_target_lines: a "clean" merge that loses a master-only line is refused', () => {
    const fake = () => ({ clean: true, text: 'a\nB\n', conflicts: 0 });
    const d = TW.decideThreeWay({ base: 'a\n', ours: 'a\nM\n', theirs: 'a\nB\n' }, fake);
    assert.equal(d.reason, 'would_drop_target_lines');
    assert.deepEqual(d.dropped, ['M']);
  });
  it('droppedTargetLines counts target-only lines as a multiset', () => {
    assert.deepEqual(TW.droppedTargetLines('x\n', 'x\nM\nM\n', 'x\nM\n'), ['M']);
    assert.deepEqual(TW.droppedTargetLines('x\nb\n', 'x\nM\n', 'x\nM\nB\n'), []);
  });
});

describe('P3019d semanticDelta (JSON union mergers get only Bastien additions)', () => {
  it('compose: an entry the target removed since the base is never re-added', () => {
    const base = compose(['_TZ_old', '_TZ_keep'], ['TS0001'], ['onoff', 'meter_power']);
    const theirs = compose(['_TZ_old', '_TZ_keep', '_TZ_new'], ['TS0001', 'TS0002'], ['onoff', 'meter_power', 'measure_power']);
    const d = TW.semanticDelta('drivers/x/driver.compose.json', base, theirs);
    assert.deepEqual(d.zigbee.manufacturerName, ['_TZ_new']);
    assert.deepEqual(d.zigbee.productId, ['TS0002']);
    assert.deepEqual(d.capabilities, ['measure_power']);
    assert.equal(TW.deltaIsEmpty('drivers/x/driver.compose.json', TW.semanticDelta('drivers/x/driver.compose.json', base, base)), true);
  });
  it('registry / sacred-keep: only new ids / couples', () => {
    const d = TW.semanticDelta('data/user-misattribution-registry.json', '{"cases":[{"id":"a"}]}', '{"cases":[{"id":"a"},{"id":"b"}]}');
    assert.deepEqual(d.cases, [{ id: 'b' }]);
    const s = TW.semanticDelta('config/architecture/publish-sacred-keep-couples.json',
      '{"couples":[{"mfr":"_A","pid":"P","driverId":"d"}]}', '{"couples":[{"mfr":"_a","pid":"P","driverId":"d"},{"mfr":"_B","pid":"P","driverId":"d"}]}');
    assert.deepEqual(s.couples.map((c) => c.mfr), ['_B']);
  });
});

describe('P3019d promoteOne (fake io, temp target tree)', () => {
  it('compose target_ahead / removed entry stays removed / new entry added', () => {
    const root = tmp();
    const rel = 'drivers/x/driver.compose.json';
    // master removed _TZ_moved (moved to its dedicated driver) since the base
    write(root, rel, compose(['_TZ_keep', '_TZ_master'], ['TS0001']));
    const base = { [rel]: compose(['_TZ_keep', '_TZ_moved'], ['TS0001']) };
    assert.equal(P.promoteOne(rel, 'REF', root, 'BASE', io(root, base, base)).reason, 'target_ahead');
    const theirs = { [rel]: compose(['_TZ_keep', '_TZ_moved', '_TZ_new'], ['TS0001']) };
    const res = P.promoteOne(rel, 'REF', root, 'BASE', io(root, base, theirs));
    assert.equal(res.ok, true);
    const out = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')).zigbee.manufacturerName;
    assert.ok(out.includes('_TZ_master') && out.includes('_TZ_new'));
    assert.ok(!out.includes('_TZ_moved'));
  });
  it('compose additions owned by another driver are dropped (one couple = one driver)', () => {
    const root = tmp();
    const rel = 'drivers/x/driver.compose.json';
    write(root, rel, compose(['_TZ_keep'], ['TS0001']));
    write(root, 'drivers/y/driver.compose.json', compose(['_TZ_other'], ['TS0001']));
    const base = { [rel]: compose(['_TZ_keep'], ['TS0001']) };
    const theirs = { [rel]: compose(['_TZ_keep', '_TZ_other'], ['TS0001']) };
    assert.equal(P.promoteOne(rel, 'REF', root, 'BASE', io(root, base, theirs)).reason, 'claimed_by_other_driver');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')).zigbee.manufacturerName, ['_TZ_keep']);
  });
  it('a pid addition that would collide with another driver couple is dropped', () => {
    const root = tmp();
    const rel = 'drivers/x/driver.compose.json';
    write(root, rel, compose(['_TZ_shared'], ['TS0001']));
    write(root, 'drivers/y/driver.compose.json', compose(['_tz_shared'], ['TS0002']));
    const delta = { zigbee: { manufacturerName: [], productId: ['TS0002', 'TS0003'] } };
    const dropped = P.dropCollidingAdditions(rel, delta, fs.readFileSync(path.join(root, rel), 'utf8'), root);
    assert.deepEqual(dropped, ['TS0002']);
    assert.deepEqual(delta.zigbee.productId, ['TS0003']);
  });
  it('stable is master-first: only delta entries master also carries', () => {
    const master = tmp();
    const rel = 'drivers/x/driver.compose.json';
    write(master, rel, compose(['_A', '_B'], ['TS0001'], ['onoff']));
    const delta = { capabilities: ['onoff', 'meter_power'], zigbee: { manufacturerName: ['_B', '_C'], productId: [] } };
    P.restrictToMaster(rel, delta, master);
    assert.deepEqual(delta.capabilities, ['onoff']);
    assert.deepEqual(delta.zigbee.manufacturerName, ['_B']);
  });
  it('a new driver is never auto-created and leaves no empty folder', () => {
    const root = tmp();
    const rel = 'drivers/newdrv/driver.compose.json';
    const r = P.promoteOne(rel, 'REF', root, 'BASE', io(root, {}, { [rel]: compose(['_N'], ['TS0001']) }));
    assert.equal(r.reason, 'new_driver_manual_review');
    const r2 = P.promoteOne('drivers/newdrv/device.js', 'REF', root, 'BASE', io(root, {}, { 'drivers/newdrv/device.js': 'x\n' }));
    assert.equal(r2.reason, 'new_driver_manual_review');
    assert.equal(fs.existsSync(path.join(root, 'drivers/newdrv')), false);
  });
  it('lib file: conflict is skipped and the target file is untouched', () => {
    const root = tmp();
    const rel = 'lib/x.js';
    write(root, rel, 'a\nM\nb\n');
    const r = P.promoteOne(rel, 'REF', root, 'BASE', io(root, { [rel]: 'a\nx\nb\n' }, { [rel]: 'a\nB\nb\n' }));
    assert.equal(r.reason, 'conflict_skipped');
    assert.equal(fs.readFileSync(path.join(root, rel), 'utf8'), 'a\nM\nb\n');
  });
  it('lib file where master is ahead and Bastien unchanged → target_ahead, untouched', () => {
    const root = tmp();
    const rel = 'lib/y.js';
    write(root, rel, 'a\nMASTER\n');
    const r = P.promoteOne(rel, 'REF', root, 'BASE', io(root, { [rel]: 'a\n' }, { [rel]: 'a\n' }));
    assert.equal(r.reason, 'target_ahead');
    assert.equal(fs.readFileSync(path.join(root, rel), 'utf8'), 'a\nMASTER\n');
  });
});

describe('P3019d post-apply guards', () => {
  it('verifyPromotedTests restores a modified test and removes a created one when they fail', () => {
    const root = tmp();
    write(root, 'test/critical/a.test.js', 'new');
    write(root, 'test/critical/b.test.js', 'created');
    const originals = new Map([['test/critical/a.test.js', 'old'], ['test/critical/b.test.js', null]]);
    const applied = [{ rel: 'test/critical/a.test.js' }, { rel: 'test/critical/b.test.js' }, { rel: 'lib/z.js' }];
    const v = P.verifyPromotedTests(root, applied, originals, () => false);
    assert.deepEqual(v.kept.map((a) => a.rel), ['lib/z.js']);
    assert.equal(fs.readFileSync(path.join(root, 'test/critical/a.test.js'), 'utf8'), 'old');
    assert.equal(fs.existsSync(path.join(root, 'test/critical/b.test.js')), false);
  });
  it('guardComposeLocks reverts a compose that breaks a passing target test, keeps pre-existing failures', () => {
    const root = tmp();
    write(root, 'drivers/sw4/driver.compose.json', 'NEW');
    write(root, 'drivers/sw5/driver.compose.json', 'NEW');
    write(root, 'test/critical/lock.test.js', "'sw4'");
    write(root, 'test/critical/broken.test.js', "'sw5'");
    const originals = new Map([['drivers/sw4/driver.compose.json', 'OLD'], ['drivers/sw5/driver.compose.json', 'OLD']]);
    const run = (r, t) => t.endsWith('lock.test.js') ? fs.readFileSync(path.join(r, 'drivers/sw4/driver.compose.json'), 'utf8') === 'OLD' : false;
    const applied = [{ rel: 'drivers/sw4/driver.compose.json' }, { rel: 'drivers/sw5/driver.compose.json' }];
    const g = P.guardComposeLocks(root, applied, originals, run);
    assert.deepEqual(g.reverted.map((x) => [x.rel, x.reason]), [['drivers/sw4/driver.compose.json', 'target_test_lock']]);
    assert.equal(fs.readFileSync(path.join(root, 'drivers/sw4/driver.compose.json'), 'utf8'), 'OLD');
    assert.equal(fs.readFileSync(path.join(root, 'drivers/sw5/driver.compose.json'), 'utf8'), 'NEW');
  });
  it('app.json: fingerprints appended in the file own layout, and only a fingerprint-only diff may be committed', () => {
    for (const minified of [false, true]) {
      const root = tmp();
      const app = { id: 'com.x', version: '1.0.0', drivers: [{ id: 'd', zigbee: { manufacturerName: ['_A'], productId: ['P1'] } }] };
      const head = minified ? JSON.stringify(app) : `${JSON.stringify(app, null, 2)}\n`;
      write(root, 'app.json', head);
      write(root, 'drivers/d/driver.compose.json', compose(['_A', '_B'], ['P1']));
      assert.equal(P.syncAppJsonFingerprints(root, ['d']), true);
      const raw = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
      assert.equal(raw.includes('\n'), !minified);
      assert.deepEqual(JSON.parse(raw).drivers[0].zigbee.manufacturerName, ['_A', '_B']);
      assert.equal(P.appJsonFingerprintOnly(root, head), true);
      write(root, 'app.json', JSON.stringify({ ...JSON.parse(raw), version: '9.9.9' }));
      assert.equal(P.appJsonFingerprintOnly(root, head), false);
    }
  });
});

describe('P3019d candidate list uses the merge-base', () => {
  it('a file only master changed is not a candidate; a Bastien change is', () => {
    const root = tmp();
    const g = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    g('init', '-q', '-b', 'master');
    g('config', 'user.email', 't@t');
    g('config', 'user.name', 't');
    write(root, 'lib/a.js', 'a\n');
    write(root, 'lib/b.js', 'b\n');
    g('add', '.');
    g('commit', '-qm', 'base');
    g('checkout', '-qb', 'bastien');
    write(root, 'lib/b.js', 'b\nB\n');
    g('commit', '-qam', 'bastien');
    g('checkout', '-q', 'master');
    write(root, 'lib/a.js', 'a\nMASTER\n');
    g('commit', '-qam', 'master');
    const list = P.listBastienChangedFiles('bastien', root);
    assert.deepEqual(list, ['lib/b.js']);
    assert.equal(TW.mergeBaseOf(root, 'bastien'), g('rev-parse', 'HEAD~1').trim());
  });
});
