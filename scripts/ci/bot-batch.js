#!/usr/bin/env node
'use strict';
/**
 * P3255d — batch bot data commits (t824u: at most one silent bot commit per day on master).
 *  divert: in GitHub Actions, when every commit in origin/master..HEAD is "[skip ci]" and touches only
 *          config deferPaths, replay them onto the rolling branch bot/data and push there (never force).
 *          Any doubt (conflict, push race, other paths, off-CI) -> not diverted, caller pushes master as before.
 *  fold:   squash bot/data (diff from its merge-base) into ONE master commit, then delete bot/data with a lease.
 * CLI: node scripts/ci/bot-batch.js divert|fold   (exit 0 = diverted/folded, 1 = not applicable)
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadCfg(cwd) {
  let c = { enabled: true, branch: 'bot/data', deferPaths: [] };
  try { c = { ...c, ...JSON.parse(fs.readFileSync(path.join(cwd, 'config', 'ci', 'bot-batch.json'), 'utf8')) }; } catch (_) { c.enabled = false; }
  if (process.env.BOT_BATCH === '0') c.enabled = false;
  return c;
}
const mkGit = (cwd) => (...a) => { const r = spawnSync('git', a, { cwd, encoding: 'utf8', maxBuffer: 64 << 20 }); return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }; };

/** Pure: may these commits be batched? commits = [{msg, files:[]}] */
function eligible(commits, deferPaths) {
  return commits.length > 0 && commits.every((c) => /\[skip ci\]/.test(c.msg) && c.files.length > 0 && c.files.every((f) => deferPaths.some((p) => f.startsWith(p))));
}

function divert({ branch = 'master', remote = 'origin', cwd = process.cwd(), env = process.env } = {}) {
  const cfg = loadCfg(cwd);
  const underTest = typeof global.describe === 'function' || !!env.NODE_TEST_CONTEXT;
  if (!cfg.enabled || branch !== 'master' || env.GITHUB_ACTIONS !== 'true' || (underTest && !env.BOT_BATCH_TEST)) return { diverted: false, reason: 'n/a' };
  const git = mkGit(cwd);
  if (!git('fetch', '-q', remote, branch).ok) return { diverted: false, reason: 'fetch' };
  const base = git('rev-parse', 'FETCH_HEAD').out;
  const head = git('rev-parse', 'HEAD').out;
  const shas = git('rev-list', '--reverse', `${base}..${head}`).out.split('\n').filter(Boolean);
  const commits = shas.map((s) => ({ msg: git('log', '-1', '--format=%B', s).out, files: git('diff-tree', '--no-commit-id', '--name-only', '-r', s).out.split('\n').filter(Boolean) }));
  if (!eligible(commits, cfg.deferPaths)) return { diverted: false, reason: 'not eligible' };
  for (let i = 1; i <= 3; i++) {
    const has = git('fetch', '-q', remote, `refs/heads/${cfg.branch}:refs/remotes/${remote}/${cfg.branch}`).ok;
    let tip = head;
    if (has) {
      git('checkout', '-q', '--detach', head);
      const r = git('rebase', '-q', '--onto', `${remote}/${cfg.branch}`, base);
      if (!r.ok) { git('rebase', '--abort'); git('checkout', '-q', head); return { diverted: false, reason: 'conflict on bot branch' }; }
      tip = git('rev-parse', 'HEAD').out;
    }
    if (git('push', '-q', remote, `${tip}:refs/heads/${cfg.branch}`).ok) { git('checkout', '-q', head); return { diverted: true, reason: `pushed ${tip.slice(0, 10)} to ${cfg.branch}` }; }
    git('checkout', '-q', head);
  }
  return { diverted: false, reason: 'push race on bot branch' };
}

function fold({ remote = 'origin', cwd = process.cwd() } = {}) {
  const cfg = loadCfg(cwd);
  const git = mkGit(cwd);
  if (!git('fetch', '-q', remote, 'master', `refs/heads/${cfg.branch}:refs/remotes/${remote}/${cfg.branch}`).ok) return { folded: false, reason: 'no bot branch' };
  const bot = git('rev-parse', `${remote}/${cfg.branch}`).out;
  const mb = git('merge-base', `${remote}/master`, bot).out;
  const files = git('diff', '--name-only', mb, bot).out.split('\n').filter(Boolean).filter((f) => cfg.deferPaths.some((p) => f.startsWith(p)));
  if (!files.length) return { folded: false, reason: 'nothing to fold', bot };
  git('checkout', '-q', '-B', 'bot-data-fold', `${remote}/master`);
  const blob = (rev, f) => { const r = spawnSync('git', ['show', `${rev}:${f}`], { cwd, encoding: 'buffer', maxBuffer: 64 << 20 }); return r.status === 0 ? r.stdout : null; };
  const skipped = [];
  for (const f of files) {
    const b = blob(mb, f), m = blob(`${remote}/master`, f), o = blob(bot, f);
    if (o === null) { if (m !== null && b !== null && m.equals(b)) git('rm', '-q', '--', f); continue; }
    if (m === null || (b !== null && m.equals(b))) { git('checkout', bot, '--', f); continue; } // master untouched since -> bot version
    if (m.equals(o)) continue;
    // both sides changed: 3-way text merge, never overwrite a human edit
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'fold-'));
    const [pm, pb, po] = ['m', 'b', 'o'].map((k) => path.join(tmp, k));
    fs.writeFileSync(pm, m); fs.writeFileSync(pb, b || Buffer.alloc(0)); fs.writeFileSync(po, o);
    const r = spawnSync('git', ['merge-file', '-q', pm, pb, po]);
    if (r.status === 0) { fs.writeFileSync(path.join(cwd, f), fs.readFileSync(pm)); git('add', '--', f); } else skipped.push(f);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (!git('diff', '--cached', '--quiet').ok) {
    const n = git('rev-list', '--count', `${mb}..${bot}`).out;
    git('commit', '-q', '-m', `chore(bot-data): daily batch of ${n} bot data commit(s) [auto:bot-data-fold] [skip ci]`);
  }
  // keep bot/data (no reset) when a file could not be merged, so nothing is lost
  return { folded: true, bot: skipped.length ? '' : bot, files: files.length, skipped };
}

module.exports = { resetBranch, eligible, divert, fold, loadCfg };

// Delete bot/data only if it still points at the folded tip (lease), so a newer bot commit is kept.
function resetBranch({ sha, remote = 'origin', cwd = process.cwd(), cfg = loadCfg(cwd) } = {}) {
  if (!/^[0-9a-f]{7,40}$/.test(String(sha || ''))) return { reset: false, reason: 'no sha' };
  const r = spawnSync('git', ['push', remote, `--force-with-lease=refs/heads/${cfg.branch}:${sha}`, `:refs/heads/${cfg.branch}`], { cwd, encoding: 'utf8' });
  return { reset: r.status === 0, reason: r.status === 0 ? 'deleted' : 'moved' };
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'reset') { const r = resetBranch({ sha: process.argv[3] }); console.log(`bot-batch reset: ${JSON.stringify(r)}`); process.exit(0); }
  const r = cmd === 'fold' ? fold() : divert({ branch: process.env.PUSH_RETRY_BRANCH || process.argv[3] || 'master' });
  console.log(`bot-batch ${cmd}: ${JSON.stringify(r)}`);
  if (process.env.GITHUB_OUTPUT && r.bot) fs.appendFileSync(process.env.GITHUB_OUTPUT, `bot=${r.bot}\n`);
  process.exit(r.diverted || r.folded ? 0 : 1);
}
