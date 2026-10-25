'use strict';
// P3034: while docs/knowledge/athom-bisect-state.json says status=running, no scheduled/push/self-heal
// run may upload or promote master; a manual dispatch with bisect_trial uploads a draft (no promotion);
// stable/Bastien are never affected; an unreadable state fails closed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { decide, MASTER_APP } = require(path.join(ROOT, '.github/scripts/bisect-hold.js'));
const wf = (f) => fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8');
const running = { status: 'running', app_id: MASTER_APP, current_trial: 1 };
const now = new Date('2026-10-25T12:00:00+01:00');

test('running bisect holds schedule, push and bare dispatch on master', () => {
  for (const eventName of ['schedule', 'push', 'workflow_dispatch', 'workflow_run']) {
    const d = decide({ state: running, appId: MASTER_APP, eventName, bisectTrial: '', now });
    assert.strictEqual(d.hold_upload, true, eventName);
    assert.strictEqual(d.hold_promote, true, eventName);
  }
});
test('manual dispatch with bisect_trial uploads but never promotes', () => {
  const d = decide({ state: running, appId: MASTER_APP, eventName: 'workflow_dispatch', bisectTrial: '1', now });
  assert.deepStrictEqual([d.hold_upload, d.hold_promote], [false, true]);
  const s = decide({ state: running, appId: MASTER_APP, eventName: 'schedule', bisectTrial: '1', now });
  assert.strictEqual(s.hold_upload, true, 'bisect_trial only counts on workflow_dispatch');
});
test('trial 0 is a real trial (string or number), empty/null is not', () => {
  for (const bisectTrial of ['0', 0, ' 0 ']) {
    const d = decide({ state: running, appId: MASTER_APP, eventName: 'workflow_dispatch', bisectTrial, now });
    assert.deepStrictEqual([d.hold_upload, d.hold_promote], [false, true], JSON.stringify(bisectTrial));
    assert.match(d.reason, /bisect trial 0 /);
  }
  for (const bisectTrial of ['', '  ', null, undefined]) {
    assert.strictEqual(decide({ state: running, appId: MASTER_APP, eventName: 'workflow_dispatch', bisectTrial, now }).hold_upload, true, String(bisectTrial));
  }
  for (const f of ['auto-fix-and-publish.yml', 'auto-publish-on-push.yml', 'publish.yml', 'verified-publish-and-diagnostics.yml']) {
    assert.match(wf(f), /BISECT_TRIAL: \$\{\{ inputs\.bisect_trial \}\}/, f);
  }
});
test('no hold when no state, status not running, or another app', () => {
  assert.strictEqual(decide({ state: null, appId: MASTER_APP, eventName: 'push', now }).hold_upload, false);
  assert.strictEqual(decide({ state: { ...running, status: 'done' }, appId: MASTER_APP, eventName: 'push', now }).hold_upload, false);
  for (const appId of ['com.dlnraja.tuya.zigbee.stable', 'com.dlnraja.tuya.zigbee.bastien']) {
    assert.strictEqual(decide({ state: running, appId, eventName: 'schedule', now }).hold_upload, false, appId);
  }
});
test('unreadable state fails closed', () => {
  const d = decide({ state: null, stateError: 'Unexpected token', appId: MASTER_APP, eventName: 'push', now });
  assert.deepStrictEqual([d.hold_upload, d.hold_promote], [true, true]);
});
test('planned routine window only inside its bounds', () => {
  const st = { ...running, untagged_window: { trial: 0, from: '2026-10-25T09:45:00+01:00', until: '2026-10-25T11:00:00+01:00' } };
  assert.strictEqual(decide({ state: st, appId: MASTER_APP, eventName: 'workflow_dispatch', now: new Date('2026-10-25T10:00:00+01:00') }).hold_upload, false);
  assert.strictEqual(decide({ state: st, appId: MASTER_APP, eventName: 'schedule', now: new Date('2026-10-25T13:05:00+01:00') }).hold_upload, true);
});
test('scheduled/push master publishers are wired to the hold', () => {
  const af = wf('auto-fix-and-publish.yml');
  assert.match(af, /bisect_trial:/);
  assert.match(af, /id: bisect_hold[\s\S]*node \.github\/scripts\/bisect-hold\.js[\s\S]*trigger_publish=false/);
  // P3036: idle wait + publish moved to a separate gated `publish` job; the hold now blocks the hand-off.
  assert.match(af, /id: p3036_handoff[\s\S]*steps\.bisect_hold\.outputs\.hold_upload \}\}" != "true"/, 'hold blocks the publish hand-off');
  assert.match(af, /\n  publish:\n[\s\S]*needs\.auto-fix\.outputs\.publish == 'true'/, 'publish job runs only after the hand-off');
  assert.ok(af.indexOf('id: bisect_hold') < af.indexOf('name: 🔁 Bump version for Homey recovery publish'));
  assert.ok(af.indexOf('name: 💾 Commit fixes') > 0, 'auto-fix commit step kept');
  const ap = wf('auto-publish-on-push.yml');
  assert.match(ap, /bisect_trial:/);
  assert.match(ap, /needs\.breaker\.outputs\.bisect_hold_upload != 'true'/);
  assert.ok((ap.match(/needs\.breaker\.outputs\.bisect_hold_promote != 'true'/g) || []).length >= 4, 'puppeteer + 3 promote tiers');
  const pb = wf('publish.yml');
  assert.match(pb, /bisect_trial:/);
  assert.match(pb, /needs: \[validate, bisect-hold(, p3036-gate)?\]\n    if: needs\.bisect-hold\.outputs\.hold_upload != 'true'/);
  assert.ok((pb.match(/needs\.bisect-hold\.outputs\.hold_promote != 'true'/g) || []).length >= 4);
  assert.match(wf('verified-publish-and-diagnostics.yml'), /needs: \[verify-and-lint, bisect-hold(, p3036-gate)?\]/);
  assert.match(wf('draft-to-test-fleet.yml'), /HOLD_MASTER[\s\S]*INC_M=false/);
});
test('bisect state file parses', () => {
  const p = path.join(ROOT, 'docs/knowledge/athom-bisect-state.json');
  if (fs.existsSync(p)) {assert.doesNotThrow(() => JSON.parse(fs.readFileSync(p, 'utf8')));}
});
