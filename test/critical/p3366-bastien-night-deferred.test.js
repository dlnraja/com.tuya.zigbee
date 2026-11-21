'use strict';

/**
 * P3366 - held Bastien uploads are re-dispatched only at night (23:00-06:00 Europe/Paris).
 * Contre quoi: a daytime publish-self-heal slot re-dispatching the Bastien publish workflow; the
 * 22:00 UTC slot exists so a held Bastien upload has a night retry in winter and summer; master and
 * stable deferrals are not touched.
 */

const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const D = require('../../.github/scripts/athom-deferred-dispatch');

const arts = [{ name: 'athom-deferred-bastien-111', created_at: '2026-11-21T14:00:00Z', expired: false },
  { name: 'athom-deferred-master-222', created_at: '2026-11-21T14:00:00Z', expired: false }];
const runs = [{ created_at: '2026-11-21T13:00:00Z', status: 'completed', event: 'push' }];

describe('P3366 Bastien deferred uploads wait for the night window', function() {
  it('daytime: Bastien is not dispatched, master still is', function() {
    const now = Date.parse('2026-11-21T16:00:00Z'); // 17h Paris
    const b = D.deferredDecision({ key: 'bastien', artifacts: arts, runs, now });
    assert.strictEqual(b.dispatch, false);
    assert.match(b.reason, /night window/);
    assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs, now }).dispatch, true);
  });

  it('night: the held Bastien upload is dispatched once', function() {
    const now = Date.parse('2026-11-21T22:00:00Z'); // 23h Paris
    assert.strictEqual(D.deferredDecision({ key: 'bastien', artifacts: arts, runs, now }).dispatch, true);
  });

  it('publish-self-heal has the 22:00 UTC slot and ships the window helper in its sparse checkout', function() {
    const wf = fs.readFileSync(path.join(__dirname, '..', '..', '.github/workflows/publish-self-heal.yml'), 'utf8');
    assert.match(wf, /cron: '0 4,8,12,16,20,22 \* \* \*'/);
    assert.match(wf, /sparse-checkout: \|\n\s+\.github\/scripts\/athom-deferred-dispatch\.js\n\s+\.github\/scripts\/bastien-night-window\.js/);
  });
});
