'use strict';
// P2900 (20/10/2026 Paris): shared Athom retry policy + publish size telemetry + pinned actions, all 3 branches.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const pol = require('../.github/scripts/athom-retry-policy');

describe('P2900 GHA hardening', () => {
  it('policy file is byte-identical on master, stable-v5 and bastien-home', () => {
    const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.github/scripts/athom-retry-policy.js'))).digest('hex');
    assert.strictEqual(h, 'c09da7dd494420dc08550abde5e0b1a44014c9409d742db45090d9c3faad252e', 'edit athom-retry-policy.js on all three branches together and update this hash');
  });
  it('backoff is exponential, capped and jittered', () => {
    assert.strictEqual(pol.backoffSeconds(1, () => 0), 60);
    assert.strictEqual(pol.backoffSeconds(2, () => 0), 120);
    assert.strictEqual(pol.backoffSeconds(9, () => 0), 240);
    assert.strictEqual(pol.backoffSeconds(1, () => 0.999), 89);
  });
  it('classifies and budgets failures', () => {
    assert.strictEqual(pol.classify('Error: socket hang up'), 'socket hang up');
    assert.strictEqual(pol.classify('AggregateError [x]'), 'AggregateError');
    assert.strictEqual(pol.classify('invalid_state'), 'invalid_state');
    assert.strictEqual(pol.classify('bad driver compose'), 'unknown');
    assert.ok(pol.shouldRetry('socket hang up', 1));
    assert.ok(!pol.shouldRetry('socket hang up', 2));
    assert.ok(!pol.shouldRetry('unknown', 0));
    assert.ok(!pol.shouldRetry('invalid_state', 0, { idleWaited: false }));
  });
  it('telemetry measures a payload and writes a CSV row', () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p2900-'));
    fs.writeFileSync(path.join(d, 'app.json'), JSON.stringify({ id: 'a', version: '1.2.3', drivers: [{}, {}], flow: { actions: [{}] } }));
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'p2900o-'));
    const { execFileSync } = require('child_process');
    const env = { ...process.env, PUBLISH_SIZE_DIR: out };
    const s = path.join(root, '.github/scripts/publish-size-telemetry.js');
    execFileSync('node', [s, 'measure', d], { env });
    execFileSync('node', [s, 'record', 'failed', 'socket hang up'], { env });
    const rows = fs.readFileSync(path.join(out, 'publish-size.csv'), 'utf8').trim().split('\n');
    assert.strictEqual(rows.length, 2);
    assert.match(rows[1], /,a,1\.2\.3,.*,2,1,failed,socket hang up$/);
  });
  it('every actions/* step in workflows is pinned to a full SHA', () => {
    const dir = path.join(root, '.github/workflows');
    const bad = [];
    for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
      for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/uses:\s*(actions\/[\w-]+)@([^\s#]+)/g)) if (!/^[0-9a-f]{40}$/.test(m[2])) bad.push(`${f}: ${m[1]}@${m[2]}`);
    }
    assert.deepStrictEqual(bad, []);
  });
});
