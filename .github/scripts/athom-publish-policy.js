'use strict';
/**
 * P3036: one Athom publish policy for every upload path (master, stable-v5, bastien-home).
 *
 * Why: the P3034 bisect (status=done, 9.0.1599 #3682 reached Test on 2026-10-25) showed the
 * rejections were not caused by the app content. They lined up with red CI, uploads too close
 * together and Athom-side "socket hang up". This is a strong presumption, not a proof, so the
 * bisect machinery stays (status=running re-arms it).
 *
 * Four rules, all pure functions here so every workflow and test uses the same code:
 *   1. ci gate      : the SHA must have the required CI workflows green (data/docs [skip ci]
 *                     commits on top of a green SHA count when no code file changed).
 *   2. slot gate    : minimum interval between uploads, max successful uploads per 24 h, no
 *                     upload while a previous build is still processing. One hang-up retry may
 *                     bypass spacing (it still waits >= 5 min).
 *   3. classify     : transient (socket hang up, ECONNRESET, ETIMEDOUT, 5xx, timeouts,
 *                     invalid_state) -> exactly 1 retry, backoff >= 5 min, breaker untouched;
 *                     real (AggregateError, processing_failed, validation) -> no retry, breaker
 *                     trips, diagnostic.
 *   4. breaker      : the single automatic retry of a transient failure is never blocked.
 *
 * This file is byte-identical on master, stable-v5 and bastien-home (test p3036 checks the
 * per-app table covers the three apps). CLI: node athom-publish-policy.js <cmd> (see bottom).
 */

const fs = require('fs');
const path = require('path');

const POLICY_VERSION = 1;

// Per-app policy. Env overrides (per workflow): ATHOM_MIN_INTERVAL_MIN, ATHOM_MAX_SUCCESS_PER_24H,
// ATHOM_CI_REQUIRED (comma list of workflow files).
const APPS = {
  'com.dlnraja.tuya.zigbee': {
    key: 'master', branch: 'master', lock: 'athom-publish-master',
    minIntervalMin: 120, maxSuccessPer24h: 1,
    ci: ['syntax-check.yml', 'unified-ci.yml', 'node22-tests.yml', 'homey-app-validate.yml'],
  },
  'com.dlnraja.tuya.zigbee.stable': {
    key: 'stable', branch: 'stable-v5', lock: 'athom-publish-stable',
    minIntervalMin: 60, maxSuccessPer24h: 4,
    ci: ['syntax-check.yml', 'node22-tests.yml', 'homey-app-validate.yml'],
  },
  'com.dlnraja.tuya.zigbee.bastien': {
    key: 'bastien', branch: 'bastien-home', lock: 'athom-publish-bastien',
    minIntervalMin: 60, maxSuccessPer24h: 4,
    ci: ['node22-tests.yml', 'homey-app-validate.yml'],
  },
};

const RETRY = { maxRetries: 1, backoffMinS: 300, jitterS: 60, hangupRetryMinGapMin: 5 };

const TRANSIENT_RE = /socket hang up|ECONNRESET|ECONNABORTED|ETIMEDOUT|EPIPE|EAI_AGAIN|fetch failed|Timeout after \d+ms|timed? ?out|specified key|NoSuchKey|too many requests|\b429\b|\b5\d\d\b|Bad Gateway|Service Unavailable|Gateway Time-?out|Internal Server Error/i;
const INVALID_STATE_RE = /invalid[_ ]state|another build .*processing|already (being )?processing/i;
const AGGREGATE_RE = /AggregateError/i;
const VALIDATION_RE = /validation (error|failed)|failed to validate|invalid (app\.json|manifest|driver)|schema error|is not allowed|must (be|have)\b|homey app validate/i;
const FINAL_RE = /^(test|live|draft|processing_failed|revoked|failed|rejected|approved)$/i;
const CODE_FILE_RE = /(\.(c|m)?js|\.ts)$|(^|\/)package(-lock)?\.json$/i;

function appPolicy(appId, env = process.env) {
  const base = APPS[appId];
  if (!base) return null;
  const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
  const ci = String(env.ATHOM_CI_REQUIRED || '').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    appId, ...base,
    minIntervalMin: num(env.ATHOM_MIN_INTERVAL_MIN, base.minIntervalMin),
    maxSuccessPer24h: num(env.ATHOM_MAX_SUCCESS_PER_24H, base.maxSuccessPer24h),
    ci: ci.length ? ci : base.ci.slice(),
  };
}

function appIdForKey(key) {
  return Object.keys(APPS).find((id) => APPS[id].key === key || APPS[id].branch === key || id === key) || null;
}

// ── 3. classification ────────────────────────────────────────────────────────────────────────
function buildText(b) {
  if (!b || typeof b !== 'object') return String(b || '');
  // homey-build-status.js rows carry Athom error fields under err/reason/message/log/fail keys; dashboard rows use stateMeta.
  const parts = [String(b.state || '')];
  for (const [k, v] of Object.entries(b)) {
    if (v && k !== 'state' && /err|reason|message|log|fail|meta|detail/i.test(k)) parts.push(typeof v === 'string' ? v : JSON.stringify(v));
  }
  return parts.join(' ');
}

/** classify(textOrBuild) -> { kind, cls: 'transient' | 'real' | 'none' } */
function classify(input) {
  const text = typeof input === 'string' ? input : buildText(input);
  const state = input && typeof input === 'object' ? String(input.state || '') : '';
  if (!text.trim()) return { kind: 'unknown', cls: 'real' };
  if (state && FINAL_RE.test(state) && !/processing_failed|failed|rejected|revoked/i.test(state)) return { kind: 'ok', cls: 'none' };
  // AggregateError wins even when the same output also mentions a hang-up (Athom-side packaging failure).
  if (AGGREGATE_RE.test(text)) return { kind: 'AggregateError', cls: 'real' };
  if (VALIDATION_RE.test(text)) return { kind: 'validation', cls: 'real' };
  if (INVALID_STATE_RE.test(text)) return { kind: 'invalid_state', cls: 'transient' };
  if (/socket hang up/i.test(text)) return { kind: 'socket hang up', cls: 'transient' };
  if (TRANSIENT_RE.test(text)) return { kind: 'transient', cls: 'transient' };
  if (/processing_failed/i.test(text)) return { kind: 'processing_failed', cls: 'real' };
  return { kind: 'unknown', cls: 'real' };
}

function backoffSeconds(rnd = Math.random()) {
  const r = Math.min(Math.max(Number(rnd) || 0, 0), 0.999999);
  return RETRY.backoffMinS + Math.floor(r * (RETRY.jitterS + 1));
}

/**
 * retryDecision({ kind|text, retriesDone, idleWaited }) -> { retry, kind, cls, backoffS, tripBreaker, diagnose, reason }
 * Transient: exactly one retry (retriesDone 0 -> retry), backoff >= 300 s, never trips the breaker.
 * invalid_state retries only after the idle wait proved the previous build is final.
 * Real: no retry, trips the breaker, asks for a diagnostic.
 */
function retryDecision({ kind, cls, text, retriesDone = 0, idleWaited = true, rnd } = {}) {
  const c = kind ? { kind, cls: cls || classify(kind).cls } : classify(text || '');
  const done = Number(retriesDone) || 0;
  if (c.cls === 'none') return { retry: false, ...c, backoffS: 0, tripBreaker: false, diagnose: false, reason: 'no failure' };
  if (c.cls === 'real') {
    return { retry: false, ...c, backoffS: 0, tripBreaker: true, diagnose: true,
      reason: `${c.kind} is a real failure: no automatic retry, breaker trips, diagnostic needed` };
  }
  if (c.kind === 'invalid_state' && !idleWaited) {
    return { retry: false, ...c, backoffS: 0, tripBreaker: false, diagnose: false,
      reason: 'invalid_state without a completed idle wait: no retry (next slot)' };
  }
  if (done >= RETRY.maxRetries) {
    return { retry: false, ...c, backoffS: 0, tripBreaker: false, diagnose: true,
      reason: `${c.kind}: the single automatic retry is already used, wait for the next slot` };
  }
  return { retry: true, ...c, backoffS: backoffSeconds(rnd), tripBreaker: false, diagnose: false,
    reason: `${c.kind} is transient: retry ${done + 1}/${RETRY.maxRetries} after >= ${RETRY.backoffMinS}s` };
}

// ── 4. breaker ───────────────────────────────────────────────────────────────────────────────
function sortBuilds(builds) {
  return (Array.isArray(builds) ? builds : []).filter((b) => b && typeof b === 'object')
    .slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}
function retryCountOf(v) {
  const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  if (!s || s === 'false' || s === '0' || s === 'no') return 0;
  if (s === 'true' || s === 'yes') return 1;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function isFailed(b) { return !!b && /processing_failed|failed|rejected/i.test(String(b.state || '')); }

/** The one exemption: transient_retry=1 dispatched for a latest build that failed transiently. */
function singleRetryExempt({ builds, transientRetry } = {}) {
  const n = retryCountOf(transientRetry);
  const latest = sortBuilds(builds)[0];
  if (n !== 1) return { exempt: false, reason: n ? `retry ${n} exceeds the single retry` : 'not a retry run' };
  if (!latest || !isFailed(latest)) return { exempt: false, reason: 'latest build is not a failure' };
  const c = classify(latest);
  if (c.cls !== 'transient') return { exempt: false, reason: `latest failure is ${c.kind} (real)` };
  return { exempt: true, reason: `single automatic retry after ${c.kind} on #${latest.id}` };
}

/** breakerAssess({ builds, n }) -> tripped when the latest build failed for a real reason or the last n all failed. */
function breakerAssess({ builds, n = 3 } = {}) {
  const s = sortBuilds(builds);
  const latest = s[0];
  if (latest && isFailed(latest) && classify(latest).cls === 'real') {
    return { tripped: true, reason: `latest build #${latest.id} failed for a real reason (${classify(latest).kind})` };
  }
  const lastN = s.slice(0, n);
  if (lastN.length >= n && lastN.every(isFailed)) return { tripped: true, reason: `last ${n} builds all failed` };
  return { tripped: false, reason: 'breaker closed' };
}

// ── 2. slot gate ─────────────────────────────────────────────────────────────────────────────
function ts(v) { const t = Date.parse(v || ''); return Number.isFinite(t) ? t : null; }

function uploadEvents({ builds, outcomes, appId }) {
  const key = (APPS[appId] || {}).key;
  const ev = new Map();
  for (const b of Array.isArray(builds) ? builds : []) {
    const t = ts(b.created) || ts(b.createdAt) || ts(b.at);
    if (t && b.id !== undefined) ev.set(`b${b.id}`, { id: b.id, t, state: String(b.state || '') });
  }
  for (const r of Array.isArray(outcomes) ? outcomes : []) {
    if (!r || typeof r !== 'object') continue;
    const rApp = r.app_id || r.app;
    if (rApp && rApp !== appId && rApp !== key) continue;
    const t = ts(r.created) || ts(r.at);
    const id = r.build || r.build_id || r.id;
    if (!t) continue;
    const k = id !== undefined ? `b${String(id).replace(/^#/, '')}` : `o${t}`;
    if (!ev.has(k)) ev.set(k, { id, t, state: String(r.state || r.outcome || '') });
  }
  return [...ev.values()].sort((a, b) => b.t - a.t);
}

function busyBuild(builds, now) {
  for (const b of sortBuilds(builds)) {
    const st = String(b.state || '');
    if (FINAL_RE.test(st)) continue;
    const at = ts(b.at) || ts(b.created);
    if (/waiting_for_files/i.test(st) && at && now - at > 5 * 60000) continue; // stuck upload, not busy
    if (at && now - at > 6 * 3600000) continue; // ancient non-final build: Athom never finished it
    return b;
  }
  return null;
}

/**
 * slotDecision -> { go, reason, deferred }
 * deferred=true means "held for a reason that clears by itself": the self-heal slot retries later.
 */
function slotDecision({ appId, builds, outcomes, snapshotOk = true, eventName, transientRetry, force, deferredRetry,
  now = Date.now(), env = process.env } = {}) {
  const p = appPolicy(appId, env);
  if (!p) return { go: true, reason: `no P3036 policy for ${appId}`, deferred: false };
  const manual = eventName === 'workflow_dispatch' && !retryCountOf(transientRetry) && !isTrue(deferredRetry);
  if (manual && isTrue(force)) return { go: true, reason: 'manual force_publish override', deferred: false };
  if (!snapshotOk) {
    return manual ? { go: true, reason: 'build list unreadable, manual dispatch allowed', deferred: false }
      : { go: false, reason: 'build list unreadable: automatic upload held (fail closed)', deferred: true };
  }
  const nowMs = typeof now === 'number' ? now : Date.parse(now);
  const busy = busyBuild(builds, nowMs);
  if (busy) return { go: false, reason: `build #${busy.id} v${busy.version || '?'} still ${busy.state}: no upload while processing`, deferred: true };
  const exempt = singleRetryExempt({ builds, transientRetry });
  const ev = uploadEvents({ builds, outcomes, appId });
  const last = ev[0];
  if (exempt.exempt) {
    if (last && nowMs - last.t < RETRY.hangupRetryMinGapMin * 60000) {
      return { go: false, reason: `single retry must wait >= ${RETRY.hangupRetryMinGapMin} min after the failed build`, deferred: true };
    }
    return { go: true, reason: `${exempt.reason}: spacing bypassed once`, deferred: false };
  }
  if (last && nowMs - last.t < p.minIntervalMin * 60000) {
    const left = Math.ceil((p.minIntervalMin * 60000 - (nowMs - last.t)) / 60000);
    return { go: false, reason: `last upload ${Math.round((nowMs - last.t) / 60000)} min ago < ${p.minIntervalMin} min (next slot in ~${left} min)`, deferred: true };
  }
  const ok24 = ev.filter((e) => nowMs - e.t < 24 * 3600000 && /^(test|live|approved)$/i.test(e.state)).length;
  if (ok24 >= p.maxSuccessPer24h) {
    return { go: false, reason: `${ok24} successful upload(s) in 24 h >= ${p.maxSuccessPer24h}`, deferred: true };
  }
  return { go: true, reason: `slot free (min ${p.minIntervalMin} min, ${ok24}/${p.maxSuccessPer24h} ok in 24 h)`, deferred: false };
}

function isTrue(v) { return /^(1|true|yes)$/i.test(String(v === undefined || v === null ? '' : v).trim()); }

// ── 1. ci gate ───────────────────────────────────────────────────────────────────────────────
function runState(run) {
  if (!run) return 'missing';
  if (run.status !== 'completed') return 'pending';
  if (run.conclusion === 'success') return 'green';
  if (run.conclusion === 'cancelled' || run.conclusion === 'skipped' || run.conclusion === 'neutral') return 'ignored';
  return 'red';
}

/**
 * evaluateCi({ required, ancestry, runsByWorkflow, codeChanged }) -> { state, perWorkflow }
 *   ancestry      : [targetSha, parent, grandparent, ...] (first-parent order)
 *   runsByWorkflow: { 'file.yml': [{ head_sha, status, conclusion, created_at }] }
 *   codeChanged   : (ancestorSha) => true | false | null  (code files changed ancestor..target)
 * state: green | red | pending | missing (worst wins: red > pending > missing > green)
 */
function evaluateCi({ required, ancestry, runsByWorkflow, codeChanged } = {}) {
  const per = {};
  const chain = Array.isArray(ancestry) ? ancestry : [];
  for (const wf of required || []) {
    const runs = ((runsByWorkflow || {})[wf] || []).slice()
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    let res = { state: 'missing', sha: null, reason: 'no run on this SHA or a code-identical ancestor' };
    for (let i = 0; i < chain.length; i++) {
      const sha = chain[i];
      const states = runs.filter((r) => r.head_sha === sha).map(runState).filter((s) => s !== 'ignored');
      if (!states.length) continue;
      const s = states[0]; // newest non-cancelled run on that commit
      if (i > 0) {
        const ch = typeof codeChanged === 'function' ? codeChanged(sha) : null;
        if (ch !== false) {
          res = { state: 'missing', sha, reason: `run on ancestor ${sha.slice(0, 10)} is stale (${ch === null ? 'diff unknown' : 'code changed since'})` };
          break;
        }
      }
      res = { state: s, sha, reason: i === 0 ? 'run on this SHA' : `run on code-identical ancestor ${sha.slice(0, 10)}` };
      break;
    }
    per[wf] = res;
  }
  const states = Object.values(per).map((r) => r.state);
  const state = states.includes('red') ? 'red' : states.includes('pending') ? 'pending' : states.includes('missing') ? 'missing' : 'green';
  return { state, perWorkflow: per };
}

function isCodeFile(f) { return CODE_FILE_RE.test(String(f || '')); }

module.exports = {
  POLICY_VERSION, APPS, RETRY, TRANSIENT_RE, CODE_FILE_RE,
  appPolicy, appIdForKey, classify, backoffSeconds, retryDecision,
  singleRetryExempt, breakerAssess, retryCountOf, slotDecision, busyBuild, uploadEvents,
  evaluateCi, runState, isCodeFile, isTrue, versionOnlyDiff,
};

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────
//   classify            stdin text -> kind (cls on stderr)
//   backoff             -> seconds (>= 300)
//   fallback            stdin CLI output -> "RETRY <s>" | "STOP <kind> <reason>" (honours ATHOM_RETRY_USED=1)
//   slot <appId>        reads data/status/homey-build-status-<app>.json + outcomes ledger
//   ci-gate <appId>     GitHub REST (GITHUB_TOKEN) + local git; waits up to CI_GATE_WAIT_MS
//   gate <appId>        ci-gate + slot, writes go/deferred/reason to GITHUB_OUTPUT. Always exits 0.
const ROOT = path.resolve(__dirname, '..', '..');

function readStdin() { try { return fs.readFileSync(0, 'utf8'); } catch { return ''; } }
function out(k, v) { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\n/g, ' ')}\n`); }
function summary(s) { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${s}\n`); }

function readSnapshot(appId) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', `homey-build-status-${appId}.json`), 'utf8'));
    const builds = Array.isArray(j) ? j : (j.builds || j.recent || []);
    return { ok: Array.isArray(builds) && !j.error, builds };
  } catch { return { ok: false, builds: [] }; }
}
function readOutcomes() {
  try {
    return fs.readFileSync(path.join(ROOT, 'docs', 'knowledge', 'athom-publish-outcomes.jsonl'), 'utf8')
      .split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

async function gh(apiPath, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN missing');
  const res = await fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}${apiPath}`, {
    method, body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`GitHub ${method} ${apiPath} -> HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

function git(args) {
  const { execFileSync } = require('child_process');
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function localAncestry(sha, depth) {
  try { git(['cat-file', '-e', `${sha}^{commit}`]); } catch { return null; }
  for (const extra of [['--filter=blob:none'], []]) {
    try { git(['fetch', '--no-tags', '--quiet', ...extra, `--depth=${depth}`, 'origin', sha]); break; } catch { /* next */ }
  }
  try { return git(['rev-list', '--first-parent', `-n${depth}`, sha]).split('\n').filter(Boolean); } catch { return null; }
}
// A bot version bump touches package.json / package-lock.json "version" only: that is not a code change.
function versionOnlyDiff(patch) {
  const lines = String(patch || '').split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---) /.test(l));
  return lines.length > 0 && lines.every((l) => /^[+-]\s*"version"\s*:/.test(l));
}
function localCodeChanged(from, to) {
  try {
    const files = git(['diff', '--no-renames', '--name-only', from, to]).split('\n').filter(Boolean);
    return files.filter(isCodeFile).some((f) => {
      if (!/(^|\/)package(-lock)?\.json$/i.test(f)) return true;
      try { return !versionOnlyDiff(git(['diff', '--no-renames', '-U0', from, to, '--', f])); } catch { return true; }
    });
  } catch { return null; }
}

async function ciGate(appId) {
  const p = appPolicy(appId);
  const repo = process.env.GITHUB_REPOSITORY;
  const sha = process.env.CI_GATE_SHA || process.env.GITHUB_SHA;
  const branch = process.env.CI_GATE_BRANCH || p.branch;
  const waitMs = Number(process.env.CI_GATE_WAIT_MS || 40 * 60000);
  const pollMs = Number(process.env.CI_GATE_POLL_MS || 60000);
  const dispatchAfterMs = Number(process.env.CI_GATE_DISPATCH_AFTER_MS || 4 * 60000);
  const depth = 60;
  const t0 = Date.now();
  let ancestry = localAncestry(sha, depth);
  const viaGit = !!ancestry;
  if (!ancestry) {
    const commits = await gh(`/repos/${repo}/commits?sha=${sha}&per_page=${depth}`);
    ancestry = commits.map((c) => c.sha);
  }
  const diffCache = new Map();
  let dispatched = false;
  let last;
  for (;;) {
    const runsByWorkflow = {};
    for (const wf of p.ci) {
      try {
        const r = await gh(`/repos/${repo}/actions/workflows/${wf}/runs?branch=${encodeURIComponent(branch)}&per_page=60`);
        runsByWorkflow[wf] = r.workflow_runs || [];
      } catch (e) { runsByWorkflow[wf] = []; }
    }
    // Code-identity check needs async API calls when git is not available: prefetch for candidate ancestors.
    for (const wf of p.ci) {
      for (const r of runsByWorkflow[wf]) {
        const i = ancestry.indexOf(r.head_sha);
        if (i > 0 && !diffCache.has(r.head_sha)) {
          let ch = viaGit ? localCodeChanged(r.head_sha, sha) : null;
          if (ch === null && !viaGit) {
            try {
              const c = await gh(`/repos/${repo}/compare/${r.head_sha}...${sha}`);
              const files = c.files || [];
              ch = files.length >= 300 ? (files.some((f) => isCodeFile(f.filename)) ? true : null) : files.some((f) => isCodeFile(f.filename));
            } catch { ch = null; }
          }
          diffCache.set(r.head_sha, ch);
        }
      }
    }
    last = evaluateCi({ required: p.ci, ancestry, runsByWorkflow, codeChanged: (s) => (diffCache.has(s) ? diffCache.get(s) : null) });
    if (last.state === 'green' || last.state === 'red') break;
    const elapsed = Date.now() - t0;
    if (last.state === 'missing' && !dispatched && elapsed >= dispatchAfterMs && isTrue(process.env.CI_GATE_DISPATCH_MISSING ?? '1')) {
      for (const [wf, r] of Object.entries(last.perWorkflow)) {
        if (r.state !== 'missing') continue;
        try { await gh(`/repos/${repo}/actions/workflows/${wf}/dispatches`, { method: 'POST', body: { ref: branch } }); console.log(`[p3036] dispatched missing CI ${wf} on ${branch}`); } catch (e) { console.log(`[p3036] could not dispatch ${wf}: ${e.message}`); }
      }
      dispatched = true;
    }
    if (elapsed + pollMs > waitMs) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return last;
}

async function main() {
  const [cmd, appArg] = process.argv.slice(2);
  if (cmd === 'classify') {
    const c = classify(readStdin());
    console.error(c.cls);
    console.log(c.kind);
    return;
  }
  if (cmd === 'backoff') { console.log(backoffSeconds()); return; }
  if (cmd === 'fallback') {
    const d = retryDecision({ text: readStdin(), retriesDone: isTrue(process.env.ATHOM_RETRY_USED) ? 1 : 0 });
    console.log(d.retry ? `RETRY ${d.backoffS}` : `STOP ${d.kind} ${d.reason}`);
    return;
  }
  const appId = appIdForKey(appArg) || appArg;
  if (!APPS[appId]) { console.error(`usage: athom-publish-policy.js <classify|backoff|fallback|slot|ci-gate|gate> <appId>`); process.exit(2); }
  const ev = {
    eventName: process.env.EVENT_NAME || process.env.GITHUB_EVENT_NAME,
    transientRetry: process.env.TRANSIENT_RETRY, force: process.env.FORCE_PUBLISH, deferredRetry: process.env.DEFERRED_RETRY,
  };
  const manual = ev.eventName === 'workflow_dispatch' && !retryCountOf(ev.transientRetry) && !isTrue(ev.deferredRetry);
  const result = { app: appId, sha: process.env.GITHUB_SHA || null, at: new Date().toISOString(), policy: POLICY_VERSION, event: ev.eventName };
  let go = true; let deferred = false; const reasons = [];
  if (cmd === 'ci-gate' || cmd === 'gate') {
    if (isTrue(process.env.CI_GATE_SKIP) && manual) {
      result.ci = { state: 'skipped', reason: 'manual CI_GATE_SKIP' };
    } else {
      try { result.ci = await ciGate(appId); } catch (e) { result.ci = { state: 'unknown', error: e.message }; }
    }
    const s = result.ci.state;
    if (s !== 'green' && s !== 'skipped') {
      go = false; deferred = true; // red too: the next slot re-checks the newest SHA
      reasons.push(`CI ${s}${result.ci.error ? ` (${result.ci.error})` : ''}`);
    }
  }
  if (cmd === 'slot' || cmd === 'gate') {
    const snap = readSnapshot(appId);
    result.slot = slotDecision({ appId, builds: snap.builds, outcomes: readOutcomes(), snapshotOk: snap.ok, ...ev });
    if (!result.slot.go) { go = false; deferred = deferred || result.slot.deferred; reasons.push(result.slot.reason); }
  }
  result.go = go; result.deferred = !go && deferred; result.reason = go ? 'all P3036 gates green' : reasons.join('; ');
  try {
    const dir = path.join(ROOT, 'data', 'status');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `athom-publish-gate-${appId}.json`), `${JSON.stringify(result, null, 2)}\n`);
  } catch { /* status file is best effort */ }
  out('go', go); out('deferred', result.deferred); out('reason', result.reason); out('ci_state', (result.ci || {}).state || 'n/a');
  summary(`### P3036 Athom publish gate (${appId})\n- go: **${go}**\n- reason: ${result.reason}\n- CI: ${(result.ci || {}).state || 'n/a'}\n`);
  if (result.ci && result.ci.perWorkflow) for (const [wf, r] of Object.entries(result.ci.perWorkflow)) summary(`  - ${wf}: ${r.state} (${r.reason})`);
  console.log(`[p3036] ${go ? 'GO' : 'HOLD'} ${appId}: ${result.reason}`);
  if (!go) console.log(`::notice::P3036 held the Athom upload: ${result.reason} — retried at the next slot`);
}

if (require.main === module) {
  main().catch((e) => { console.log(`[p3036] HOLD (gate error, fail closed): ${e.message}`); out('go', 'false'); out('deferred', 'true'); out('reason', `gate error: ${e.message}`); process.exit(0); });
}
