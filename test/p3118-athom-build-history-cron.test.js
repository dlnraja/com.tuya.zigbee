'use strict';
// P3118: athom-build-history must run on its own (daily cron), read-only, honour the kill switch.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const wf = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/athom-build-history.yml'), 'utf8');
describe('P3118 athom-build-history daily cron', () => {
  it('has a daily schedule and keeps dispatch', () => {
    assert.match(wf, /schedule:\s*\n\s*- cron: '47 5 \* \* \*'/);
    assert.match(wf, /workflow_dispatch:/);
  });
  it('stays read-only with a kill switch and short artifact retention', () => {
    assert.match(wf, /permissions:\s*\n\s*contents: read\n(?!\s+\w+: write)/);
    assert.match(wf, /autonomy-paused\.watch/);
    assert.match(wf, /retention-days: 7/);
    assert.match(wf, /inputs\.limit \|\| '50'/);
  });
});
