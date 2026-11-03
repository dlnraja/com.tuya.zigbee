'use strict';
// P3257: KB docs synced from master (add-only) stay present on this branch.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
describe('P3257 KB docs synced from master', () => {
  it('synced KB files exist', () => {
    for (const f of ['docs/knowledge/KB/DP_ENDPOINT_COVERAGE.notes.md','docs/knowledge/KB/MODULES_DYNAMIC_AND_FEATURES.md','docs/knowledge/KB/MODULES_FLOW_ENERGY_AND_LAYERS.md','docs/knowledge/KB/UPSTREAM_DAILY_2026-11-01.md','docs/knowledge/KB/UPSTREAM_DAILY_2026-11-02.md','docs/knowledge/KB/UPSTREAM_DAILY_2026-11-03.md','docs/knowledge/KB/athom-publish-history.md','docs/knowledge/KB/forum-patterns.md']) assert.ok(fs.existsSync(path.join(__dirname, '..', f)), f);
  });
});
