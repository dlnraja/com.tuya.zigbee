'use strict';
// WHY(P3025, 25/10/2026 Paris): node twin of .github/scripts/git-push-retry.sh, used by safe-auto-commit.js.
// Before: 3 tries, linear 3-7 s sleeps, and a FAILED `git pull` (network blip, fetch 5xx) was reported as a
// "rebase conflict" on #557 and the commit dropped. Now: fetch failures are retried (transient), only a real
// rebase conflict stops the loop, backoff is exponential with jitter, never force, never rewrite remote history.
const { spawnSync } = require('child_process');
const { resolveRebaseConflicts } = require('./json-ledger-merge'); // P3199

function backoffMs(attempt, { baseMs = 4000, capMs = 60000, jitterMs = 7000, rnd = Math.random } = {}) {
  const a = Math.max(1, Number(attempt) || 1);
  return Math.min(baseMs * (2 ** (a - 1)), capMs) + Math.floor(rnd() * jitterMs);
}

function defaultGit(cwd) {
  return (...a) => spawnSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 });
}

/** @returns {Promise<{ok:boolean, reason:'pushed'|'nothing'|'conflict'|'exhausted', attempts:number, details:string}>} */
async function pushWithRetry({ branch, remote = 'origin', cwd = process.cwd(), git = defaultGit(cwd), attempts = Number(process.env.PUSH_RETRY_ATTEMPTS || 5),
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)), backoff = {} } = {}) {
  let details = '';
  for (let i = 1; i <= attempts; i++) {
    const f = git('fetch', '-q', remote, branch);
    if (f.status === 0) {
      if (git('merge-base', '--is-ancestor', 'HEAD', 'FETCH_HEAD').status === 0) return { ok: true, reason: 'nothing', attempts: i, details };
      if (git('merge-base', '--is-ancestor', 'FETCH_HEAD', 'HEAD').status !== 0) {
        const r = git('-c', 'rebase.autoStash=true', 'rebase', '-q', 'FETCH_HEAD');
        if (r.status !== 0) {
          // P3199: structural merge for append-mostly ledger/lead JSON; anything else still aborts.
          let res = { ok: false, details: '' }; let steps = 0;
          while (steps++ < 20) {
            res = resolveRebaseConflicts({ git, cwd });
            if (!res.ok) break;
            const c = git('-c', 'core.editor=true', 'rebase', '--continue');
            if (c.status === 0) break;
            if (!git('diff', '--name-only', '--diff-filter=U').stdout.trim()) { res = { ok: false, details: `${c.stdout || ''}${c.stderr || ''}` }; break; }
          }
          if (!res.ok) { git('rebase', '--abort'); return { ok: false, reason: 'conflict', attempts: i, details: `${r.stdout || ''}${r.stderr || ''}${res.details ? `\n[json-merge] ${res.details}` : ''}` }; }
        }
      }
      const p = git('push', '-q', remote, `HEAD:refs/heads/${branch}`);
      if (p.status === 0) return { ok: true, reason: 'pushed', attempts: i, details };
      details = `push rejected: ${(p.stderr || '').trim().slice(-400)}`;
    } else {
      details = `fetch failed: ${(f.stderr || '').trim().slice(-400)}`;
    }
    if (i < attempts) await sleep(backoffMs(i, backoff));
  }
  return { ok: false, reason: 'exhausted', attempts, details };
}

module.exports = { pushWithRetry, backoffMs };
