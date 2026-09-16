#!/usr/bin/env node
'use strict';

/**
 * p2529-deep-functional-enrich-gate.js
 * Contre quoi: workflows/L99 stop at mfr+pid without deep functional pass.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../..');
const SSOT = path.join(ROOT, 'config/architecture/deep-functional-enrich-ssot.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  assert.ok(fs.existsSync(SSOT), 'SSOT missing');
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  assert.equal(ssot._meta.id, 'P2529');
  assert.ok(Array.isArray(ssot.requiredAuditVectors) && ssot.requiredAuditVectors.length >= 8);
  const ids = ssot.requiredAuditVectors.map((v) => v.id);
  for (const need of ['dp_map', 'clusters', 'rx_path', 'tx_path', 'flow_wire', 'contre_quoi']) {
    assert.ok(ids.includes(need), `missing vector ${need}`);
  }

  assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/deep-functional-enrich-pass.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'docs/rules/DEEP_FUNCTIONAL_ENRICH.md')));
  assert.ok(fs.existsSync(path.join(ROOT, '.cursor/rules/deep-functional-enrich-always.mdc')));

  const orch = read('tools/ci/l99-inbox-intelligence-orchestrator.js');
  assert.match(orch, /deep-functional|P2529|functionalDeep/);

  const cfg = JSON.parse(read('config/enrichment/l99-inbox-intelligence.json'));
  assert.ok(
    (cfg.phases.full || []).includes('functionalDeep')
      || (cfg.scripts && cfg.scripts.functionalDeep),
    'L99 config must register functionalDeep',
  );

  const l99Yml = read('.github/workflows/l99-inbox-intelligence.yml');
  assert.match(l99Yml, /enrich:functional|deep-functional-enrich|P2529/);

  const forumYml = read('.github/workflows/forum-poll.yml');
  assert.match(forumYml, /enrich:functional|deep-functional-enrich|P2529/);

  for (const yml of [
    'gmail-diagnostics.yml',
    'auto-enrich-closed-loop.yml',
    'fetch-diags.yml',
    'recurrent-orchestrator.yml',
    'auto-bot-issue-triage.yml',
  ]) {
    assert.match(
      read(`.github/workflows/${yml}`),
      /enrich:functional|deep-functional-enrich|P2529/,
      `${yml} must soft-hook P2529`,
    );
  }

  const pass = read('tools/ci/deep-functional-enrich-pass.js');
  assert.match(pass, /probeDriverDepth/);
  assert.match(pass, /extractCouple/);

  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['check:p2529'], 'check:p2529 missing');
  assert.ok(pkg.scripts['enrich:functional'], 'enrich:functional missing');

  console.log('[P2529] PASS deep functional enrich gate');
}

try {
  main();
} catch (e) {
  console.error('[P2529] FAIL', e.message);
  process.exit(1);
}
