'use strict';

/**
 * P3070 — publish-baseline-gate must judge the payload, not the raw source app.json.
 *
 * WHY: run on the root app.json the gate listed 177 (master) / 115 (stable-v5) / 11 (bastien-home)
 * couples as "would disappear", while the real prepare-publish payload had all of them: couples
 * that moved to a dedicated driver are re-pinned on their shipped driver during compaction.
 * --source builds that payload view in memory; a couple whose shipped driver is gone must still fail.
 */

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const { describe, it } = require('../_support/dual-runner');
const { checkBaseline, sourceToPayload } = require('../../scripts/maintenance/publish-baseline-gate.cjs');

const ROOT = path.join(__dirname, '..', '..');
const NO_DB = { byMfr: new Map(), byDriver: new Map() };
const drv = (id, m, p) => ({ id, zigbee: { manufacturerName: m, productId: p } });

describe('P3070 baseline gate on source manifests', () => {
  it('couple moved to a dedicated driver is found in the payload view, not in the raw source', () => {
    const baseline = { version: 't', exemptions: [], drivers: { climate_sensor: { m: ['_TZE284_aaaaaaaa'], p: ['TS0201'] } } };
    const src = { drivers: [drv('climate_sensor', ['_TZ3000_other'], ['TS0201']), drv('climate_zt', ['_TZE284_aaaaaaaa'], ['TS0601'])] };
    assert.strictEqual(checkBaseline(src, baseline).missing.length, 1, 'raw source misses it');
    const view = sourceToPayload(src, ROOT, { mfsDb: NO_DB, baseline: baseline, holdIds: new Set() });
    assert.deepStrictEqual(checkBaseline(view, baseline).missing, []);
    assert.ok(src.drivers[0].zigbee.manufacturerName.length === 1, 'source object untouched');
  });

  it('a couple whose shipped driver is held back still fails', () => {
    const baseline = { version: 't', exemptions: [], drivers: { gone: { m: ['_TZ3000_bbbbbbbb'], p: ['TS0001'] } } };
    const src = { drivers: [drv('gone', ['_TZ3000_bbbbbbbb'], ['TS0001'])] };
    const view = sourceToPayload(src, ROOT, { mfsDb: NO_DB, baseline: baseline, holdIds: new Set(['gone']) });
    assert.strictEqual(checkBaseline(view, baseline).missing.length, 1);
  });

  it('CLI on the repo-root app.json is green (payload view)', () => {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/maintenance/publish-baseline-gate.cjs'), path.join(ROOT, 'app.json')], { encoding: 'utf8' });
    assert.match(out, /in-memory payload view/);
    assert.match(out, /OK: all \d+ couples/);
  });
});
