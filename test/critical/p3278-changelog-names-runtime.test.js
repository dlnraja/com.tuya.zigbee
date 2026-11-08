'use strict';
// 5.12.545 said "4 small fixes in the app core" and 5.12.546 said the devices
// were unchanged and the build was publishing tooling only. The commits in
// that range name a clamp correction and diagnostic breadcrumbs.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CE = require('../../scripts/automation/changelog-entry');

describe('P3278 changelog names runtime changes', () => {
  it('names the clamp correction and the diagnostic breadcrumbs instead of a tooling-only line', () => {
    const note = CE.precise([
      'fix(drivers/power_clamp_meter): scale bidirectional clamp reports on the 3-phase profile',
      'chore(diag): stderr breadcrumbs for large JSON parses and capped device notes',
      'test(changelog): lock the precise publish call in the suite Node 22 runs',
    ]);
    assert.match(note.en, /bidirectional clamp reports/);
    assert.match(note.en, /stderr breadcrumbs/);
    assert.equal(/tooling only|small fix/i.test(note.en), false);
  });

  it('keeps a tooling-only note when no runtime subject exists', () => {
    const note = CE.precise([
      'chore(publish): state that a 5.x stable publish is not a 9.x overwrite',
      'test: lock a workflow sentence',
    ]);
    assert.match(note.en, /Maintenance build/);
  });
});
