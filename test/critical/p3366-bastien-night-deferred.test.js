'use strict';

/**
 * P3366 / t1025u - held Bastien uploads are re-dispatched at any hour, like master
 * and stable. The old 23:00-06:00 Paris hold is gone. P3036 quotas, spacing and
 * busy-build gates still apply inside the dispatched publish workflow.
 * Contre quoi: a leftover night check in athom-deferred-dispatch.js would keep a
 * held Bastien upload waiting until 23h; self-heal must still ship the dispatcher.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const D = require('../../.github/scripts/athom-deferred-dispatch');

const arts = [{ name: 'athom-deferred-bastien-111', created_at: '2026-11-21T14:00:00Z', expired: false },
  { name: 'athom-deferred-master-222', created_at: '2026-11-21T14:00:00Z', expired: false }];
const runs = [{ created_at: '2026-11-21T13:00:00Z', status: 'completed', event: 'push' }];

describe('P3366/t1025u Bastien deferred uploads retry at any hour', function() {
  it('daytime: Bastien is dispatched, same as master', function() {
    const now = Date.parse('2026-11-21T16:00:00Z'); // 17h Paris
    const b = D.deferredDecision({ key: 'bastien', artifacts: arts, runs, now });
    assert.strictEqual(b.dispatch, true);
    assert.ok(!/night window/.test(b.reason));
    assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs, now }).dispatch, true);
  });

  it('night: the held Bastien upload is still dispatched once', function() {
    const now = Date.parse('2026-11-21T22:00:00Z'); // 23h Paris
    assert.strictEqual(D.deferredDecision({ key: 'bastien', artifacts: arts, runs, now }).dispatch, true);
  });

  it('publish-self-heal ships the dispatcher and does not require a night-window helper', function() {
    const wf = fs.readFileSync(path.join(__dirname, '..', '..', '.github/workflows/publish-self-heal.yml'), 'utf8');
    assert.match(wf, /cron: '0 4,8,12,16,20,22 \* \* \*'/);
    assert.match(wf, /sparse-checkout: \|\n\s+\.github\/scripts\/athom-deferred-dispatch\.js/);
    assert.ok(!/isNightWindow/.test(fs.readFileSync(path.join(__dirname, '..', '..', '.github/scripts/athom-deferred-dispatch.js'), 'utf8')));
  });
});
