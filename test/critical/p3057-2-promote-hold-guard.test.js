'use strict';
const { describe, it } = require('../_support/dual-runner');
/**
 * P3057-2: the autonomous Bastien promote must not carry behaviour or pins to master/stable while the
 * target's P3036 hold window runs or its last send is not accepted yet; CI/test/docs and the
 * data-safety allowlist still pass. Wired in tools/ci/bastien-promote-upstream.js for both targets.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const H = require('../../tools/ci/promote-hold-guard');

const ROOT = path.join(__dirname, '..', '..');
const cfg = { holds: [{ app: 'master', until: '2026-10-26T13:57:00+01:00', reason: 'P3036' }], dataSafetyAllow: ['lib/utils/MemwarnGuard.js', 'lib/memory/'] };
const accepted = [{ app: 'master', version: '9.0.1599', state: 'test' }, { app_id: 'com.dlnraja.tuya.zigbee.stable', version: '5.12.507', state: 'test' }];

describe('P3057-2 promote publish-hold guard', () => {
  it('version compare is numeric', () => {
    assert.strictEqual(H.cmpVersion('9.0.1601', '9.0.1599'), 1);
    assert.strictEqual(H.cmpVersion('5.12.99', '5.12.507'), -1);
    assert.strictEqual(H.cmpVersion('1.0.0', '1.0.0'), 0);
  });
  it('hold window active before until, inactive after', () => {
    const before = H.holdState({ app: 'master', appVersion: '9.0.1599', now: Date.parse('2026-10-26T10:00:00+01:00'), cfg, outcomes: accepted });
    assert.ok(before.active && /hold window/.test(before.reasons[0]));
    const after = H.holdState({ app: 'master', appVersion: '9.0.1599', now: Date.parse('2026-10-26T14:00:00+01:00'), cfg, outcomes: accepted });
    assert.deepStrictEqual(after, { active: false, reasons: [] });
  });
  it('pending send (version above last accepted) holds; accepted in the build snapshot releases', () => {
    const now = Date.parse('2026-10-27T10:00:00+01:00');
    const p = H.holdState({ app: 'master', appVersion: '9.0.1601', now, cfg, outcomes: accepted });
    assert.ok(p.active && /pending send/.test(p.reasons.join()));
    const r = H.holdState({ app: 'master', appVersion: '9.0.1601', now, cfg, outcomes: accepted, builds: [{ version: '9.0.1601', state: 'test' }] });
    assert.strictEqual(r.active, false);
    assert.strictEqual(H.holdState({ app: 'stable', appVersion: '5.12.507', now, cfg, outcomes: accepted }).active, false);
  });
  it('fails closed without a version or an accepted record', () => {
    assert.ok(H.holdState({ app: 'master', appVersion: '', cfg: {}, outcomes: accepted }).active);
    assert.ok(H.holdState({ app: 'stable', appVersion: '5.12.1', cfg: {}, outcomes: [] }).active);
  });
  it('allowlist: CI/test/docs and data-safety pass; drivers, sacred pins, app.json, other lib wait', () => {
    for (const ok of ['test/critical/x.test.js', '.github/workflows/a.yml', 'tools/ci/a.js', 'scripts/ci/a.js', 'docs/x.md', 'README.md', 'lib/utils/MemwarnGuard.js', 'lib/memory/MemoryBudget.js']) {assert.ok(H.isHoldAllowed(ok, cfg), ok);}
    for (const no of ['drivers/a/driver.compose.json', 'config/architecture/publish-sacred-keep-couples.json', 'app.json', 'lib/utils/Other.js', 'drivers/a/device.js']) {assert.ok(!H.isHoldAllowed(no, cfg), no);}
  });
  it('guardPublishHold restores held files and keeps allowed ones', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3057-2-'));
    fs.mkdirSync(path.join(dir, 'drivers', 'a'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'test'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'drivers', 'a', 'driver.compose.json'), 'NEW');
    fs.writeFileSync(path.join(dir, 'drivers', 'a', 'brand-new.js'), 'NEW');
    fs.writeFileSync(path.join(dir, 'test', 't.test.js'), 'NEW');
    const applied = [{ rel: 'drivers/a/driver.compose.json' }, { rel: 'drivers/a/brand-new.js' }, { rel: 'test/t.test.js' }];
    const originals = new Map([['drivers/a/driver.compose.json', 'OLD'], ['drivers/a/brand-new.js', null], ['test/t.test.js', 'OLD']]);
    const g = H.guardPublishHold(dir, applied, originals, { active: true, reasons: ['pending send'] }, cfg);
    assert.deepStrictEqual(g.kept.map((a) => a.rel), ['test/t.test.js']);
    assert.deepStrictEqual(g.reverted.map((a) => a.reason), ['publish_hold_active', 'publish_hold_active']);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'drivers', 'a', 'driver.compose.json'), 'utf8'), 'OLD');
    assert.ok(!fs.existsSync(path.join(dir, 'drivers', 'a', 'brand-new.js')));
    assert.strictEqual(fs.readFileSync(path.join(dir, 'test', 't.test.js'), 'utf8'), 'NEW');
    const off = H.guardPublishHold(dir, applied, originals, { active: false, reasons: [] }, cfg);
    assert.strictEqual(off.kept.length, 3);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('the promote script wires the guard for master and for stable (meta from the master checkout)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools', 'ci', 'bastien-promote-upstream.js'), 'utf8');
    assert.ok(/HOLD\.loadHoldInputs\(ROOT, 'master'\)/.test(src));
    assert.ok(/HOLD\.loadHoldInputs\(stableDir, 'stable', ROOT\)/.test(src));
    assert.strictEqual((src.match(/HOLD\.guardPublishHold\(/g) || []).length, 2);
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'promote-publish-hold.json'), 'utf8'));
    assert.ok(Array.isArray(c.holds) && Array.isArray(c.dataSafetyAllow));
  });
});
