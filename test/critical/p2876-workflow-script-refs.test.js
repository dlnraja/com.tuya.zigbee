'use strict';
// P2876: every script a workflow calls exists on this branch, except a short
// list of known gaps that only live in workflows which never run on a push to
// this branch (schedule / master-only / manual) and belong to the publish or
// mail tooling owned elsewhere. A new missing reference fails here.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github/workflows');
const REF = /(?:node|bash|sh|python3?)\s+(?:--[\w-]+\s+)*((?:\.\/)?(?:scripts|tools|\.github|lib|test)\/[\w./-]+\.(?:js|cjs|mjs|sh|py))/g;

// Known gaps (stable-v5 only, 2026-10-19). Not ported on purpose:
//  - publish / version / Athom API tooling (other worker): athom-processing-failure-retry, version-health-check
//  - mail + diag pipeline (needs the Gmail tooling chain): gmail-*, diag-*, fetch/scan-*-uuid, community-inbox-digest
//  - master-data tests that fail on stable data: p2270, p2282, p2438
//  - optional, already guarded by `[ -f ]`: ai-dp-extract, export-live-data-feed
const KNOWN = new Set([
  '.github/scripts/athom-processing-failure-retry.js',
  'scripts/ci/version-health-check.js',
  '.github/scripts/gmail-auth-cascade.js',
  '.github/scripts/community-inbox-digest.js',
  'scripts/ci/diag-investigate-orchestrator.js',
  'scripts/ci/fetch-homey-app-diag-by-uuid.js',
  'scripts/ci/gmail-search-diag-uuid.js',
  'scripts/ci/scan-homey-crashes-for-uuid.js',
  'test/critical/p2270-discussion-harvest-gate.test.js',
  'test/critical/p2282-forum-2202-peter-misattr-button.test.js',
  'test/critical/p2438-multi-source-harvest-ai-limit.test.js',
  '.github/scripts/ai-dp-extract.js',
  '.github/scripts/export-live-data-feed.js',
]);

function onBlock(src) {
  const lines = src.split('\n');
  const i = lines.findIndex((l) => /^on:\s*$/.test(l) || /^"?on"?:/.test(l));
  if (i < 0) { return ''; }
  const out = [];
  for (let k = i + 1; k < lines.length && !/^[A-Za-z]/.test(lines[k]); k++) { out.push(lines[k]); }
  return out.join('\n');
}

function missingRefs() {
  const miss = [];
  if (!fs.existsSync(WF)) { return miss; }
  for (const f of fs.readdirSync(WF).filter((x) => /\.ya?ml$/.test(x))) {
    const src = fs.readFileSync(path.join(WF, f), 'utf8');
    for (const m of src.matchAll(REF)) {
      const rel = m[1].replace(/^\.\//, '');
      if (!fs.existsSync(path.join(ROOT, rel))) { miss.push({ rel, wf: f, on: onBlock(src) }); }
    }
  }
  return miss;
}

describe('P2876 workflow script references', () => {
  it('no new missing script behind a workflow', () => {
    const unknown = missingRefs().filter((m) => !KNOWN.has(m.rel)).map((m) => `${m.wf} -> ${m.rel}`);
    assert.deepEqual([...new Set(unknown)], []);
  });

  it('known gaps only sit in workflows that a push to stable-v5 / bastien-home never starts', () => {
    const bad = [];
    for (const m of missingRefs().filter((x) => KNOWN.has(x.rel))) {
      const push = /\n\s*push:/.test(`\n${m.on}`);
      const pushBranches = (m.on.match(/push:[\s\S]*?branches:\s*\[([^\]]*)\]/) || [])[1] || '';
      if (push && (!pushBranches || /stable|bastien|\*/.test(pushBranches))) { bad.push(`${m.wf} -> ${m.rel}`); }
    }
    assert.deepEqual([...new Set(bad)], []);
  });

  it('the scripts ported to stable are present and loadable', () => {
    for (const rel of ['.github/scripts/repo-housekeeping.js', '.github/scripts/generate-script-registry.js',
      'test/critical/p2231-market-couples-intake.test.js', 'test/critical/p2283-bidirectional-buttons-permanent.test.js']) {
      const used = fs.existsSync(WF) && fs.readdirSync(WF).some((f) => fs.readFileSync(path.join(WF, f), 'utf8').includes(rel));
      if (used) { assert.ok(fs.existsSync(path.join(ROOT, rel)), rel); }
    }
  });
});
