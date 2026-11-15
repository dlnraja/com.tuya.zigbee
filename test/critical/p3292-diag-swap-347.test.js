'use strict';
// P3292 (15/11/2026, owner decision 13:13 Paris): one diagnostic Draft upload at a constant 347 drivers,
// releasing one held driver while one long-published driver is left out of THAT payload only.
// Draft only (no Test/Live promotion), the source repo keeps every driver and couple, and the P3095
// bisect is paused meanwhile so nothing else is released.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');
const hr = require('../../scripts/publish-hold-release');
const bg = require('../../scripts/maintenance/publish-baseline-gate.cjs');
const bis = require('../../.github/scripts/publish-hold-bisect');

const hold = { drivers: [{ id: 'siren_moes_mg_bjq002' }, { id: 'heiman_siren' }] };

describe('P3292 diagnostic swap at a constant driver count', () => {
  it('a swap leaves the swapped-out driver out and releases the swapped-in one', () => {
    const { ids, released, swappedOut } = hr.effectiveHoldIds(hold, 'siren_moes_mg_bjq002', 'sound_sensor_tuya');
    assert.deepStrictEqual([...ids].sort(), ['heiman_siren', 'sound_sensor_tuya']);
    assert.deepStrictEqual(released, ['siren_moes_mg_bjq002']);
    assert.deepStrictEqual(swappedOut, ['sound_sensor_tuya']);
  });

  it('no swap by default: the hold set is unchanged', () => {
    const { ids, swappedOut } = hr.effectiveHoldIds(hold, 'siren_moes_mg_bjq002', '');
    assert.deepStrictEqual([...ids], ['heiman_siren']);
    assert.deepStrictEqual(swappedOut, []);
  });

  it('resolveSwap keeps the count constant and refuses anything else', () => {
    assert.deepStrictEqual(hr.resolveSwap(hold, { PUBLISH_HOLD_RELEASE: 'siren_moes_mg_bjq002', PUBLISH_DIAG_SWAP_OUT: 'sound_sensor_tuya' }), ['sound_sensor_tuya']);
    assert.deepStrictEqual(hr.resolveSwap(hold, {}), []);
    assert.throws(() => hr.resolveSwap(hold, { PUBLISH_HOLD_RELEASE: '', PUBLISH_DIAG_SWAP_OUT: 'sound_sensor_tuya' }), /same number/);
    assert.throws(() => hr.resolveSwap(hold, { PUBLISH_HOLD_RELEASE: 'siren_moes_mg_bjq002', PUBLISH_DIAG_SWAP_OUT: 'a,b' }), /same number/);
    assert.throws(() => hr.resolveSwap(hold, { PUBLISH_HOLD_RELEASE: 'siren_moes_mg_bjq002', PUBLISH_DIAG_SWAP_OUT: 'heiman_siren' }), /already held/);
    assert.throws(() => hr.resolveSwap(hold, { PUBLISH_HOLD_RELEASE: 'not_held', PUBLISH_DIAG_SWAP_OUT: 'sound_sensor_tuya' }), /not held/);
  });

  it('the Test-package couple gate exempts only couples of the swapped-out driver', () => {
    const baseline = { version: 'x', drivers: {
      sound_sensor_tuya: { m: ['_TZ_a'], p: ['P1'] },
      switch_1gang: { m: ['_TZ_b'], p: ['P2'] },
    } };
    const manifest = { drivers: [] };
    assert.strictEqual(bg.checkBaseline(manifest, baseline).missing.length, 2);
    const r = bg.checkBaseline(manifest, baseline, { swappedOut: new Set(['sound_sensor_tuya']) });
    assert.deepStrictEqual(r.missing, ['_TZ_b+P2 (was switch_1gang)']);
    assert.strictEqual(r.swappedOut, 1);
  });

  it('a paused bisect neither dispatches nor resolves its pending group', () => {
    const state = { queue: [['a', 'b']], attempts: {}, isolated: [], pending: { ids: ['a', 'b'], at: new Date().toISOString() },
      paused: { reason: 'P3292 diagnostic swap', at: '2026-11-15T12:20:00Z' } };
    const d = bis.dispatchDecision({ state, heldIds: ['a', 'b'] });
    assert.strictEqual(d.dispatch, false);
    assert.match(d.reason, /paused/);
    assert.ok(d.state.paused, 'pause survives normState');
    assert.deepStrictEqual(bis.resolveForRun({ envRelease: '', state, heldIds: ['a', 'b'] }), []);
    assert.deepStrictEqual(bis.resolveForRun({ envRelease: 'a', state, heldIds: ['a', 'b'] }), ['a']);
    const live = { ...state, paused: null };
    assert.deepStrictEqual(bis.resolveForRun({ envRelease: '', state: live, heldIds: ['a', 'b'] }), ['a', 'b']);
  });

  it('the workflow exposes the swap as a manual Draft-only input', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.match(wf, /diagnostic_swap_out:/);
    assert.match(wf, /PUBLISH_DIAG_SWAP_OUT: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.diagnostic_swap_out \|\| '' \}\}/);
    // every promotion tier, the GitHub release and the Test verify skip a swap run
    for (const name of ['Install Puppeteer', 'Tier 1: Promote via Browser', 'Tier 2: Promote via OAuth', 'Tier 3: Promote via PAT API', 'Create GitHub Release', 'Verify draft promotion result']) {
      const i = wf.indexOf(`- name: ${name}`.replace('- name: Tier', '- name: "Tier'));
      assert.ok(i > 0, name);
      const ifLine = wf.slice(i, i + 900).split('\n').find((l) => /^\s+if:/.test(l));
      assert.ok(ifLine && ifLine.includes("inputs.diagnostic_swap_out == ''"), `${name} must skip a swap run`);
    }
    // a swap verdict never reaches the P3095 bisect, and a transient retry carries the swap
    assert.match(wf, /-z "\$\{PUBLISH_DIAG_SWAP_OUT:-\}"/);
    assert.match(wf, /-f diagnostic_swap_out="\$\{PUBLISH_DIAG_SWAP_OUT:-\}"/);
  });

  it('prepare-publish applies the swap through resolveSwap and the gate exemption', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(src, /resolveSwap\(/);
    assert.match(src, /checkBaseline\(.*\{ swappedOut \}\)/);
  });
});
