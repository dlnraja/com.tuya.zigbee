#!/usr/bin/env node
'use strict';
/**
 * P3048 — deterministic CI failure triage (no AI, GITHUB_TOKEN only).
 *
 * classify(text)  -> { cls: 'transient' | 'real' | 'none', kind }
 *   transient = network / runner / registry hiccups (socket hang up, ETIMEDOUT, ECONNRESET, 5xx, 429,
 *   runner lost …) + patterns learned from the journal (data/automation/failure-patterns.json).
 * signature(...)  -> stable 12-hex id of workflow + job + step + normalised first error line.
 * decide(...)     -> 'rerun' only when: not a publish workflow, transient, first attempt, < 3 automatic
 *                    re-runs of this workflow in 24 h and < 3 occurrences of the signature in 24 h.
 *                    Everything else is 'record' (journal; the daily watchdog opens one issue per signature).
 * learn(entries)  -> new transient patterns from 'recovered' journal lines (self-improvement, additive).
 *
 * CLI:
 *   node scripts/automation/ci-failure.cjs handle --run-id=N [--dry]   (ci-autofix.yml)
 *   node scripts/automation/ci-failure.cjs collect [--hours=24]        (automation-loop.yml → journal)
 *   node scripts/automation/ci-failure.cjs classify < log.txt
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const PATTERNS_FILE = path.join(ROOT, 'data', 'automation', 'failure-patterns.json');

const TRANSIENT_RE = /socket hang up|ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|ESOCKETTIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND registry|getaddrinfo|network (error|timeout)|fetch failed|Timeout after \d+ms|request timed? ?out|\b(HTTP|status|code)[ :]*(429|5\d\d)\b|too many requests|rate limit exceeded|Bad Gateway|Service Unavailable|Gateway Time-?out|Internal Server Error|The runner has received a shutdown signal|lost communication with the server|The operation was canceled|No space left on device|npm ERR! code (ECONNRESET|ETIMEDOUT|EAI_AGAIN|E5\d\d)|Failed to download action|Unable to resolve action|Could not resolve host|RPC failed|early EOF|remote: Internal Server Error/i;
// Never learned as transient: they describe the code, a test or the app manifest.
const REAL_HINT_RE = /AssertionError|assert\.|expected .* to|SyntaxError|TypeError|ReferenceError|RangeError|Cannot find module|is not defined|validation (error|failed)|failed to validate|homey app validate|schema|lint|eslint|test(s)? failed|\d+ failing|gate (failed|red)|regression|AggregateError|processing_failed|invalid_flow_card/i;
const PUBLISH_RE = /publish|draft-to-test|promote|release|deploy-pages|athom/i;

function loadLearned(file = PATTERNS_FILE) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (Array.isArray(j.transient) ? j.transient : []).filter((p) => p && typeof p.literal === 'string' && p.literal.length >= 8);
  } catch { return []; }
}

function classify(text, learned = loadLearned()) {
  const t = String(text || '');
  if (!t.trim()) return { cls: 'none', kind: 'empty' };
  const m = TRANSIENT_RE.exec(t);
  if (m) return { cls: 'transient', kind: m[0].toLowerCase().slice(0, 60) };
  const low = t.toLowerCase();
  for (const p of learned) if (low.includes(p.literal.toLowerCase())) return { cls: 'transient', kind: `learned:${p.literal.slice(0, 40)}` };
  return { cls: 'real', kind: REAL_HINT_RE.test(t) ? 'code-or-test' : 'unknown' };
}

/** Strip volatile parts (timestamps, ids, numbers, paths, hashes) so one cause = one signature. */
function normalizeMessage(line) {
  return String(line || '')
    .replace(/^\S*\d{4}-\d\d-\d\dT[\d:.]+Z\s*/, '')
    .replace(/##\[(error|warning)\]/g, '')
    .replace(/\b[0-9a-f]{7,40}\b/gi, '<h>')
    .replace(/\/[\w.\-/]+/g, '<p>')
    .replace(/\d+(\.\d+)?/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function signature({ workflow, job, step, message }) {
  const s = [workflow, job, step, normalizeMessage(message)].map((x) => String(x || '')).join('|');
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

/** Pick the most telling error lines of a job log (bounded). */
function errorLines(log, max = 8) {
  const lines = String(log || '').split('\n');
  const hits = lines.filter((l) => /##\[error\]|\bError\b|ERR!|\bFAIL(ED)?\b|failing|exit code [1-9]|fatal:/i.test(l) && !/::(group|endgroup)/.test(l));
  return hits.slice(-max).map((l) => l.replace(/^\S*\d{4}-\d\d-\d\dT[\d:.]+Z\s*/, '').trim().slice(0, 300));
}

function isPublishWorkflow(nameOrPath) { return PUBLISH_RE.test(String(nameOrPath || '')); }

function decide({ workflow, path: wfPath, cls, runAttempt = 1, reruns24h = 0, sigCount24h = 0 }) {
  if (isPublishWorkflow(workflow) || isPublishWorkflow(wfPath)) return { action: 'record', reason: 'publish workflow: never re-run automatically' };
  if (cls !== 'transient') return { action: 'record', reason: 'real failure: journal + watchdog issue' };
  if (Number(runAttempt) > 1) return { action: 'record', reason: `attempt ${runAttempt}: the single automatic re-run is spent` };
  if (reruns24h >= 3) return { action: 'record', reason: `${reruns24h} automatic re-runs of this workflow in 24 h (cap 3)` };
  if (sigCount24h >= 3) return { action: 'record', reason: `signature seen ${sigCount24h} times in 24 h (cap 3)` };
  return { action: 'rerun', reason: 'transient, first attempt: one re-run of the failed jobs' };
}

/**
 * learn(entries, existing) -> new patterns. Input: journal lines with status 'recovered' carrying
 * data.message (normalised error of the failed attempt). >= 2 distinct runs in 30 days, not a code hint.
 */
function learn(entries, existing = [], { now = Date.now(), minRuns = 2 } = {}) {
  const have = new Set(existing.map((p) => p.literal.toLowerCase()));
  const byMsg = new Map();
  for (const e of entries || []) {
    if (!e || e.status !== 'recovered' || !e.data || !e.data.message) continue;
    const t = Date.parse(e.at); if (!Number.isFinite(t) || now - t > 30 * 86400000) continue;
    // Longest constant fragment of the normalised message (no number / hash / path placeholder).
    const literal = normalizeMessage(e.data.message).split(/<[hpn]>/).map((x) => x.trim()).sort((a, b) => b.length - a.length)[0].slice(0, 80);
    if (literal.length < 12 || REAL_HINT_RE.test(e.data.message) || TRANSIENT_RE.test(e.data.message)) continue;
    if (!literal || have.has(literal.toLowerCase())) continue;
    if (!byMsg.has(literal)) byMsg.set(literal, new Set());
    byMsg.get(literal).add(e.run || e.key || e.at);
  }
  const out = [];
  for (const [literal, runs] of byMsg) if (runs.size >= minRuns) out.push({ literal, learnedAt: new Date(now).toISOString(), evidence: [...runs].slice(0, 5) });
  return out;
}

module.exports = { TRANSIENT_RE, REAL_HINT_RE, classify, normalizeMessage, signature, errorLines, isPublishWorkflow, decide, learn, loadLearned, PATTERNS_FILE };

// ── CLI (network) ────────────────────────────────────────────────────────────────────────────
async function failedJobsOf(gh, REPO, runId, attempt) {
  const p = attempt ? `/repos/${REPO}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=50` : `/repos/${REPO}/actions/runs/${runId}/jobs?per_page=50&filter=latest`;
  const r = await gh(p, { soft: true });
  return ((r && r.jobs) || []).filter((j) => j.conclusion === 'failure');
}

async function analyseRun(gh, REPO, run, { attempt, maxLogs = 3 } = {}) {
  const jobs = await failedJobsOf(gh, REPO, run.id, attempt);
  const out = [];
  for (const [i, j] of jobs.entries()) {
    const step = ((j.steps || []).find((s) => s.conclusion === 'failure') || {}).name || '';
    let lines = [];
    if (i < maxLogs) { const log = await gh(`/repos/${REPO}/actions/jobs/${j.id}/logs`, { soft: true, raw: true }); lines = errorLines(log); }
    const text = lines.join('\n');
    const c = classify(`${text}\n${step}`);
    out.push({ job: j.name, step, message: lines[lines.length - 1] || step, cls: lines.length ? c.cls : 'real', kind: lines.length ? c.kind : 'no-log', sig: signature({ workflow: run.name, job: j.name, step, message: lines[lines.length - 1] || '' }) });
  }
  return out;
}

async function cliHandle(runId, dry) {
  const { gh, REPO } = require('./gh.cjs');
  const journal = require('./journal.cjs');
  const run = await gh(`/repos/${REPO}/actions/runs/${runId}`);
  const res = { run: run.id, workflow: run.name, path: run.path, attempt: run.run_attempt, conclusion: run.conclusion, sha: run.head_sha };
  if (run.conclusion !== 'failure') {
    res.action = 'none'; res.reason = `conclusion ${run.conclusion}`;
  } else {
    const jobs = await analyseRun(gh, REPO, run);
    res.jobs = jobs;
    const cls = jobs.length && jobs.every((j) => j.cls === 'transient') ? 'transient' : 'real';
    const since = new Date(Date.now() - 86400000).toISOString();
    const wfRuns = await gh(`/repos/${REPO}/actions/workflows/${run.workflow_id}/runs?created=%3E%3D${since}&per_page=100`, { soft: true });
    const reruns24h = ((wfRuns && wfRuns.workflow_runs) || []).filter((r) => r.run_attempt > 1).length;
    const sigs = new Set(jobs.map((j) => j.sig));
    const sigCount24h = journal.readSince(24).filter((e) => e.data && sigs.has(e.data.sig)).length;
    Object.assign(res, { cls, reruns24h, sigCount24h }, decide({ workflow: run.name, path: run.path, cls, runAttempt: run.run_attempt, reruns24h, sigCount24h }));
    if (res.action === 'rerun' && !dry) {
      const ok = await gh(`/repos/${REPO}/actions/runs/${run.id}/rerun-failed-jobs`, { method: 'POST', soft: true });
      res.rerun = ok ? 'requested' : 'refused';
    }
  }
  fs.mkdirSync(path.join(ROOT, 'data', 'status'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'status', 'ci-autofix-last.json'), `${JSON.stringify(res, null, 2)}\n`);
  const md = `### CI autofix (P3048, no AI)\n- run: ${res.workflow} #${res.run} attempt ${res.attempt}\n- class: ${res.cls || 'n/a'} → **${res.action}** (${res.reason})${res.rerun ? ` · re-run ${res.rerun}` : ''}\n${(res.jobs || []).map((j) => `  - ${j.job} / ${j.step}: ${j.cls} (${j.kind}) sig ${j.sig}`).join('\n')}\n`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
}

async function cliCollect(hours) {
  const { gh, REPO } = require('./gh.cjs');
  const journal = require('./journal.cjs');
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const failed = ((await gh(`/repos/${REPO}/actions/runs?status=failure&created=%3E%3D${since}&per_page=100`, { soft: true })) || {}).workflow_runs || [];
  const done = ((await gh(`/repos/${REPO}/actions/runs?status=success&created=%3E%3D${since}&per_page=100`, { soft: true })) || {}).workflow_runs || [];
  let n = 0; let logs = 0;
  for (const run of failed.slice(0, 60)) {
    const key = `ci-fail:${run.id}:${run.run_attempt}`;
    if (journal.seen(key, { hours: 24 * 7 })) continue;
    const jobs = await analyseRun(gh, REPO, run, { maxLogs: logs < 15 ? 1 : 0 }); logs++;
    const j = jobs[0] || { sig: signature({ workflow: run.name }), cls: 'real', kind: 'no-job', step: '', job: '' };
    const r = journal.append({ workflow: 'ci-collect', status: j.cls === 'transient' ? 'transient' : 'fail', key, run: run.id,
      summary: `${run.name} failed on ${run.head_branch} (${j.job} / ${j.step}: ${j.kind})`,
      data: { wf: run.path, name: run.name, branch: run.head_branch, sha: (run.head_sha || '').slice(0, 10), sig: j.sig, message: normalizeMessage(j.message), publish: isPublishWorkflow(run.path) } });
    if (r.appended) n++;
  }
  for (const run of done.filter((r) => r.run_attempt > 1).slice(0, 20)) {
    const key = `ci-recovered:${run.id}`;
    if (journal.seen(key, { hours: 24 * 7 })) continue;
    const prev = await analyseRun(gh, REPO, run, { attempt: run.run_attempt - 1, maxLogs: 1 });
    const p = prev[0];
    if (!p) continue;
    const r = journal.append({ workflow: 'ci-collect', status: 'recovered', key, run: run.id,
      summary: `${run.name} recovered on attempt ${run.run_attempt} (same commit)`,
      data: { wf: run.path, name: run.name, branch: run.head_branch, sha: (run.head_sha || '').slice(0, 10), sig: p.sig, message: p.message, cls: p.cls } });
    if (r.appended) n++;
  }
  console.log(`[ci-collect] ${failed.length} failed / ${done.length} ok runs in ${hours} h → ${n} new journal line(s)`);
}

if (require.main === module) {
  const [cmd] = process.argv.slice(2);
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const fail = (e) => { console.log(`::warning::ci-failure ${cmd}: ${e.message}`); process.exit(0); };
  if (cmd === 'handle') cliHandle(arg('run-id', process.env.RUN_ID), process.argv.includes('--dry')).catch(fail);
  else if (cmd === 'collect') cliCollect(Number(arg('hours', 24))).catch(fail);
  else if (cmd === 'classify') { const c = classify(fs.readFileSync(0, 'utf8')); console.log(`${c.cls} ${c.kind}`); }
  else { console.error('usage: ci-failure.cjs <handle|collect|classify>'); process.exit(2); }
}
