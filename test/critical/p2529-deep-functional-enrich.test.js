'use strict';

/**
 * P2529 — Deep functional enrich Contre quoi (not mfr+pid-only).
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('P2529 deep functional enrich', () => {
  it('SSOT lists DP/cluster/flow/RX-TX vectors', () => {
    const ssot = JSON.parse(read('config/architecture/deep-functional-enrich-ssot.json'));
    assert.equal(ssot._meta.id, 'P2529');
    const ids = ssot.requiredAuditVectors.map((v) => v.id);
    assert.ok(ids.includes('dp_map'));
    assert.ok(ids.includes('flow_wire'));
    assert.ok(ids.includes('rx_path'));
    assert.ok(ids.includes('tx_path'));
    assert.ok(ssot.forbiddenShallowClosures.some((s) => /mfr\+pid only/i.test(s)));
  });

  it('all harvest workflows hook the functional pass', () => {
    assert.match(read('tools/ci/l99-inbox-intelligence-orchestrator.js'), /functionalDeep|P2529/);
    const hooks = [
      '.github/workflows/l99-inbox-intelligence.yml',
      '.github/workflows/forum-poll.yml',
      '.github/workflows/auto-enrich-closed-loop.yml',
      '.github/workflows/gmail-diagnostics.yml',
      '.github/workflows/fetch-diags.yml',
      '.github/workflows/recurrent-orchestrator.yml',
      '.github/workflows/auto-bot-issue-triage.yml',
    ];
    for (const rel of hooks) {
      assert.match(read(rel), /P2529|enrich:functional/, `${rel} must soft-hook P2529`);
    }
  });

  it('pass script classifies flow/DP symptoms and probes driver depth', () => {
    const src = read('tools/ci/deep-functional-enrich-pass.js');
    assert.match(src, /classifySymptom/);
    assert.match(src, /flow_wire/);
    assert.match(src, /FUNCTIONAL_AUDIT/);
    assert.match(src, /P2520|complementary/i);
    assert.match(src, /probeDriverDepth/);
    assert.match(src, /extractCouple/);
  });
});
