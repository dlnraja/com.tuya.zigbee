'use strict';

/**
 * P2418 / P2419 — compensate incomplete reports + hang-proof cron wiring
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
assert.ok(script.includes('COMPENSATE_MAX_MS'), 'P2419 wall-clock');
assert.ok(script.includes('scanProcessMdForMissingPid'), 'P2419 line-scan (no catastrophic regex)');

for (const wf of [
  'forum-poll.yml',
  'auto-enrich-closed-loop.yml',
  'l99-inbox-intelligence.yml',
  'recurrent-orchestrator.yml',
  'fetch-diags.yml',
]) {
  const yml = fs.readFileSync(path.join(ROOT, '.github', 'workflows', wf), 'utf8');
  assert.ok(yml.includes('compensate-incomplete-reports'), `${wf} wires compensate`);
  assert.ok(yml.includes('--skip-investigate'), `${wf} skip-investigate`);
}

const t0 = Date.now();
execFileSync(process.execPath, [
  path.join(ROOT, 'tools', 'ci', 'compensate-incomplete-reports.js'),
  '--skip-investigate',
], {
  cwd: ROOT,
  stdio: 'pipe',
  timeout: 20000,
  env: { ...process.env, COMPENSATE_MAX_MS: '15000', COMPENSATE_SOFT_EXIT: '1' },
});
assert.ok(Date.now() - t0 < 15000, 'compensate must finish under wall-clock');

const vh = fs.readFileSync(path.join(ROOT, 'scripts', 'ci', 'version-health-check.js'), 'utf8');
assert.ok(vh.includes('tipHealthy'), 'P2419 version-health tipHealthy soft-expect');

const dap = fs.readFileSync(path.join(ROOT, 'scripts', 'direct-api-publish.js'), 'utf8');
assert.ok(dap.includes('SOFT-EXPECT P2419'), 'P2419 direct-publish soft-exit on healthy tip');

console.log('P2418/P2419 compensate + hang-proof cron wiring: PASS');
