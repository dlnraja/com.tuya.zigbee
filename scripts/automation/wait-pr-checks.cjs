#!/usr/bin/env node
'use strict';
/**
 * P3048 t539u (b) — Dependabot gate. master has no branch protection, so `gh pr merge --auto` merged a
 * Dependabot PR after `node --check app.js` only. This waits (polite polling, GITHUB_TOKEN only) until every
 * check run on the PR head SHA is completed, then answers green only when:
 *   - no workflow run failed / timed out / was cancelled (except this gate itself);
 *   - every REQUIRED check that is present succeeded, and at least `--min-required` of them ran
 *     (homey-app-validate runs on every non-doc change; node22-tests on package.json changes).
 * Writes `green=true|false` and `reason=` to $GITHUB_OUTPUT. Never merges, comments or approves itself.
 *
 *   node scripts/automation/wait-pr-checks.cjs --sha=<head sha> [--self="Dependabot Auto-Merge"]
 *        [--required="Homey App Validate,Node 22,Syntax"] [--min-required=1] [--timeout-min=35]
 */
const fs = require('fs');

const BAD = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure', 'stale']);

/** verdict(checkRuns, opts) -> { done, green, reason } (pure, tested). */
function verdict(runs, { self = [], required = [], minRequired = 1 } = {}) {
  const mine = (n) => self.some((s) => s && String(n).includes(s));
  const rs = (runs || []).filter((r) => !mine(r.name));
  const pending = rs.filter((r) => r.status !== 'completed');
  if (pending.length) return { done: false, green: false, reason: `waiting for ${pending.map((r) => r.name).slice(0, 5).join(', ')}` };
  const bad = rs.filter((r) => BAD.has(r.conclusion));
  if (bad.length) return { done: true, green: false, reason: `failed: ${bad.map((r) => `${r.name}=${r.conclusion}`).slice(0, 5).join(', ')}` };
  const req = rs.filter((r) => required.some((q) => q && String(r.name).toLowerCase().includes(q.toLowerCase())));
  const okReq = req.filter((r) => r.conclusion === 'success');
  if (okReq.length < minRequired) return { done: true, green: false, reason: `only ${okReq.length} required check(s) succeeded (need ${minRequired}: ${required.join(', ')})` };
  return { done: true, green: true, reason: `${rs.length} check(s) completed, ${okReq.length} required green` };
}

async function main() {
  const { gh, REPO, sleep } = require('./gh.cjs');
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const sha = arg('sha', process.env.HEAD_SHA);
  const opts = { self: String(arg('self', 'Dependabot Auto-Merge')).split(','), required: String(arg('required', 'Homey App Validate,Node 22,Syntax')).split(',').map((s) => s.trim()), minRequired: Number(arg('min-required', 1)) };
  const deadline = Date.now() + Number(arg('timeout-min', 35)) * 60000;
  let v = { done: false, green: false, reason: 'no check yet' };
  await sleep(Number(arg('initial-wait-s', 60)) * 1000);
  while (Date.now() < deadline) {
    // Workflow runs (not check runs): job names like "test"/"validate" are ambiguous, workflow names are not.
    const r = await gh(`/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=100`, { soft: true });
    const latest = new Map();
    for (const x of (r && r.workflow_runs) || []) { const k = x.workflow_id; if (!latest.has(k) || x.run_attempt > latest.get(k).run_attempt || x.id > latest.get(k).id) latest.set(k, x); }
    v = verdict([...latest.values()], opts);
    console.log(`[wait-pr-checks] ${v.reason}`);
    if (v.done) break;
    await sleep(60000);
  }
  if (!v.done) v = { done: true, green: false, reason: `timeout: ${v.reason}` };
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `green=${v.green}\nreason=${v.reason.replace(/\n/g, ' ')}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Dependabot gate (P3048)\n- ${v.green ? 'green' : 'not green'}: ${v.reason}\n`);
}

module.exports = { verdict };
if (require.main === module) main().catch((e) => { console.log(`::warning::wait-pr-checks: ${e.message}`); if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'green=false\nreason=error\n'); });
