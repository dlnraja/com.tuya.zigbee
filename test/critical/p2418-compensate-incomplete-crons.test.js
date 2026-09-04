'use strict';

/**
 * P2418 — compensate incomplete reports + cron wiring
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

const hypo = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config', 'enrichment', 'soft-hypotheses-missing-pid.json'),
  'utf8',
));
assert.ok(Array.isArray(hypo.hypotheses) && hypo.hypotheses.length >= 4, 'soft hypotheses SSOT');
assert.ok(hypo.hypotheses.every((h) => h.mfr && h.pid && h.driver), 'every hypo has mfr+pid+driver');

const script = fs.readFileSync(path.join(ROOT, 'tools', 'ci', 'compensate-incomplete-reports.js'), 'utf8');
assert.ok(script.includes('NEED_INTERVIEW'), 'need interview doctrine');
assert.ok(script.includes('never invent'), 'no invent note');

for (const wf of [
  'forum-poll.yml',
  'auto-enrich-closed-loop.yml',
  'l99-inbox-intelligence.yml',
  'recurrent-orchestrator.yml',
  'fetch-diags.yml',
]) {
  const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', wf), 'utf8');
  assert.ok(yml.includes('compensate-incomplete-reports'), `${wf} wires P2418`);
}

execFileSync(process.execPath, [
  path.join(ROOT, 'tools', 'ci', 'compensate-incomplete-reports.js'),
  '--skip-investigate',
], { cwd: ROOT, stdio: 'pipe', timeout: 60000 });

console.log('P2418 compensate + cron wiring: PASS');
