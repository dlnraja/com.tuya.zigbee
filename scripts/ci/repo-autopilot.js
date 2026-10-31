#!/usr/bin/env node
'use strict';
/**
 * P3022 — repo autopilot: process every open PR and issue of this repo, without posting anything.
 *
 *   node scripts/ci/repo-autopilot.js [--dry] [--max-prs=10] [--max-issues=30] [--max-branches=10]
 *        [--max-merges=2] [--max-behind=150] [--min-age-days=7] [--local-gate] [--out=reports/autopilot]
 *
 * Bot PRs (bot/*, auto/*, ai/monthly-audit-*): merged (normal merge, head sha pinned) when current and
 *   green; closed without comment when superseded by a newer PR of the same kind, or stale
 *   (> max-behind commits behind and older than min-age-days); held otherwise.
 * Bot branches (bot/* only): deleted when the PR is closed/merged, the branch is superseded or merged,
 *   and every commit on it is a bot commit. Protected branches and fix/* are never deleted.
 * External contributor PRs: analysed (files, tests, couples); exact new couples go to
 *   data/leads/github-leads.json, which strict-apply (oss-lan-source-enrich) turns into gated,
 *   rewritten, source-credited fingerprints. Never closed, never commented.
 * Issues: classified (tracking / already-supported / fix-in-code / new-couple / needs-info) against the
 *   driver composes; actionable ones go to the ledger (pending) and exact new couples to the lead file.
 *   Draft replies live in the report only. Issues are never closed or commented.
 * Owner PRs (fix/*, codex/*, port/*...) and keep/pinned labels are never touched.
 * GITHUB_TOKEN only. Node built-ins only (+ repo scripts). Every list is bounded.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const R = require('../lib/repo-autopilot-rules');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const num = (k, d) => { const n = Number(arg(k, d)); return Number.isFinite(n) && n >= 0 ? n : d; };
const ROOT = path.resolve(arg('root', process.cwd()));
const DRY = process.argv.includes('--dry') || process.env.AUTOPILOT_DRY === 'true';
const LOCAL_GATE = process.argv.includes('--local-gate');
const MAX_PRS = num('max-prs', 10);
const MAX_ISSUES = num('max-issues', 30);
const MAX_BRANCHES = num('max-branches', 10);
const MAX_MERGES = num('max-merges', 2);
const OUT = path.resolve(ROOT, arg('out', 'reports/autopilot'));
const REPO = process.env.GITHUB_REPOSITORY || 'dlnraja/com.tuya.zigbee';
const OWNER = REPO.split('/')[0];
const NOW = Date.now();
const OPT = { owner: OWNER, now: NOW, maxBehind: num('max-behind', R.DEFAULTS.maxBehind), minAgeDays: num('min-age-days', R.DEFAULTS.minAgeDays) };

async function gh(p, opts = {}) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'tuya-repo-autopilot', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GITHUB_TOKEN) {headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;}
  if (opts.body) {headers['Content-Type'] = 'application/json';}
  const url = p.startsWith('http') ? p : `https://api.github.com${p}`;
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    const e = new Error(`${opts.method || 'GET'} ${p}: HTTP ${res.status} ${t.slice(0, 200)}`); e.status = res.status; throw e;
  }
  return res.status === 204 ? null : res.json();
}
const write = async (p, opts) => { if (DRY) {return { dry: true };} return gh(p, opts); };

const normPr = (p) => ({
  number: p.number, title: p.title, state: p.state, merged: !!p.merged_at, draft: !!p.draft,
  author: p.user && p.user.login, authorType: p.user && p.user.type,
  headRef: p.head && p.head.ref, headSha: p.head && p.head.sha, baseRef: p.base && p.base.ref,
  isCrossRepository: !!(p.head && p.head.repo && p.head.repo.full_name !== REPO) || !(p.head && p.head.repo),
  createdAt: p.created_at, labels: (p.labels || []).map((l) => l.name), url: p.html_url, nodeId: p.node_id,
});

async function checksFor(sha) {
  const out = [];
  try { const r = await gh(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`); for (const c of r.check_runs || []) {out.push({ status: c.status, conclusion: c.conclusion, name: c.name });} } catch { /* none */ }
  try { const s = await gh(`/repos/${REPO}/commits/${sha}/status`); for (const c of s.statuses || []) {out.push({ status: c.state === 'pending' ? 'in_progress' : 'completed', conclusion: c.state, name: c.context });} } catch { /* none */ }
  return out;
}

function localGate(pr) {
  // Runs the shared rules gates (full profile) on the PR head in a throwaway worktree.
  const ref = `refs/autopilot/pr-${pr.number}`;
  const dir = path.join(ROOT, '..', `autopilot-pr-${pr.number}`);
  const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 600000 });
  if (run('git', ['fetch', '--no-tags', 'origin', `+pull/${pr.number}/head:${ref}`], ROOT).status !== 0) {return 'red';}
  run('git', ['worktree', 'remove', '--force', dir], ROOT);
  if (run('git', ['worktree', 'add', '--detach', dir, ref], ROOT).status !== 0) {return 'red';}
  try {
    const nm = path.join(ROOT, 'node_modules');
    if (fs.existsSync(nm) && !fs.existsSync(path.join(dir, 'node_modules'))) {fs.symlinkSync(nm, path.join(dir, 'node_modules'), 'dir');}
    const g = run('node', ['scripts/ci/rules-gates.js', '--profile=full'], dir);
    return g.status === 0 ? 'green' : 'red';
  } finally { run('git', ['worktree', 'remove', '--force', dir], ROOT); }
}

function resyncBranch(pr) {
  // P3090 — merge the base into a regenerable bot branch, base wins on conflicting hunks; plain push
  // (fast-forward of the bot branch only, never a protected branch).
  if (R.PROTECTED_BRANCHES.has(pr.headRef)) {return false;}
  const dir = path.join(ROOT, '..', `autopilot-resync-${pr.number}`);
  const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 300000 });
  if (run('git', ['fetch', '--no-tags', 'origin', pr.baseRef, pr.headRef], ROOT).status !== 0) {return false;}
  run('git', ['worktree', 'remove', '--force', dir], ROOT);
  if (run('git', ['worktree', 'add', '--detach', dir, `origin/${pr.headRef}`], ROOT).status !== 0) {return false;}
  try {
    const id = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];
    if (run('git', [...id, 'merge', '--no-edit', '-X', 'theirs', `origin/${pr.baseRef}`, '-m', `chore(autopilot): re-sync ${pr.headRef} with ${pr.baseRef} (base wins on generated data)`], dir).status !== 0) {return false;}
    if (DRY) {return true;}
    return run('git', ['push', 'origin', `HEAD:refs/heads/${pr.headRef}`], dir).status === 0;
  } finally { run('git', ['worktree', 'remove', '--force', dir], ROOT); }
}

function fixCommitsFor(n) {
  const r = spawnSync('git', ['log', '-n', '40', '--format=%H%x09%s', '-E', `--grep=#${n}([^0-9]|$)`, 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) {return [];}
  return r.stdout.split('\n').filter(Boolean).map((l) => l.split('\t')).filter(([, s]) => R.isFixSubject(s)).map(([h]) => h).slice(0, 5);
}

async function main() {
  const report = { generated: new Date(NOW).toISOString(), dry: DRY, repo: REPO, limits: { MAX_PRS, MAX_ISSUES, MAX_BRANCHES, MAX_MERGES, ...OPT, now: undefined },
    prs: [], branches: [], issues: [], external: [], errors: [] };
  let index = null;
  try { index = require('../leads/strict-apply').buildIndex(ROOT); } catch (e) { report.errors.push(`index: ${e.message}`); index = { byMfr: new Map(), byDriver: new Map() }; }

  // ---- PRs ----
  const all = (await gh(`/repos/${REPO}/pulls?state=all&per_page=100&sort=created&direction=desc`)).map(normPr);
  const open = all.filter((p) => p.state === 'open').slice(0, MAX_PRS);
  let merges = 0; let gatesRun = 0; let resyncs = 0;
  for (const pr of open) {
    try {
      const origin = R.prOrigin(pr, OWNER);
      const ctx = { ...OPT, all };
      if (origin === 'bot') {
        try { const c = await gh(`/repos/${REPO}/compare/${encodeURIComponent(pr.baseRef)}...${pr.headSha}`); ctx.behindBy = c.behind_by; } catch { ctx.behindBy = null; }
        const files = await gh(`/repos/${REPO}/pulls/${pr.number}/files?per_page=100`).catch(() => []);
        ctx.files = files.map((f) => f.filename);
        ctx.checks = await checksFor(pr.headSha);
        const full = await gh(`/repos/${REPO}/pulls/${pr.number}`).catch(() => ({}));
        pr.mergeable = full.mergeable; pr.mergeableState = full.mergeable_state;
      }
      let d = R.decidePr(pr, ctx);
      if (d.needsLocalGate && LOCAL_GATE && gatesRun < 1) { gatesRun++; ctx.localGate = localGate(pr); d = R.decidePr(pr, ctx); }
      const row = { number: pr.number, headRef: pr.headRef, author: pr.author, origin, draft: pr.draft, behindBy: ctx.behindBy, ...d, done: false };
      if (d.action === 'resync') {
        if (resyncs >= 2) { row.action = 'hold'; row.reason = 'resync cap 2 reached this run'; }
        else { resyncs++; row.done = resyncBranch(pr); if (!row.done) {row.action = 'hold'; row.reason += ' (resync failed)';} }
      } else if (d.action === 'close') {
        await write(`/repos/${REPO}/pulls/${pr.number}`, { method: 'PATCH', body: { state: 'closed' } });
        row.done = !DRY; pr.state = 'closed';
      } else if (d.action === 'merge') {
        if (merges >= MAX_MERGES) { row.action = 'hold'; row.reason = `merge cap ${MAX_MERGES} reached this run`; }
        else {
          if (pr.draft && !DRY) {
            await gh('/graphql', { method: 'POST', body: { query: 'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number}}}', variables: { id: pr.nodeId } } });
          }
          await write(`/repos/${REPO}/pulls/${pr.number}/merge`, { method: 'PUT', body: { merge_method: 'merge', sha: pr.headSha } });
          merges++; row.done = !DRY; pr.state = 'closed'; pr.merged = true;
        }
      } else if (d.action === 'analyse') {
        const files = await gh(`/repos/${REPO}/pulls/${pr.number}/files?per_page=100`).catch(() => []);
        report.external.push(R.analyseExternal(pr, files, index));
      }
      report.prs.push(row);
    } catch (e) { report.errors.push(`pr #${pr.number}: ${e.message}`); }
  }

  // ---- bot branches ----
  let refs = [];
  try { refs = (await gh(`/repos/${REPO}/git/matching-refs/heads/bot/`)).map((r) => r.ref.replace('refs/heads/', '')); } catch (e) { report.errors.push(`refs: ${e.message}`); }
  for (const ref of refs.slice(0, MAX_BRANCHES)) {
    try {
      const prs = all.filter((p) => p.headRef === ref && !p.isCrossRepository);
      const last = prs[0];
      const merged = prs.some((p) => p.merged);
      const prState = prs.some((p) => p.state === 'open') ? 'open' : (last ? 'closed' : 'none');
      const superseded = last ? !!R.supersededBy(last, all) : all.some((p) => R.prKind(p.headRef) === R.prKind(ref) && !p.isCrossRepository);
      let commits = null; let behindBy = null;
      try {
        const c = await gh(`/repos/${REPO}/compare/master...${encodeURIComponent(ref)}`);
        behindBy = c.behind_by;
        commits = (c.commits || []).map((k) => ({ author: k.author && k.author.login, authorType: k.author && k.author.type, committer: k.committer && k.committer.login, committerType: k.committer && k.committer.type }));
        // A commit without a linked account (plain git identity) counts as human unless it is the Actions bot identity.
        (c.commits || []).forEach((k, i) => { if (!k.author && /github-actions\[bot\]/.test(k.commit?.author?.email || '')) {commits[i].author = 'github-actions[bot]';} });
      } catch { commits = null; }
      const v = R.branchDeletable(ref, { prState, merged, superseded, commits, behindBy, maxBehind: OPT.maxBehind, labels: last && last.labels });
      if (v.ok) {await write(`/repos/${REPO}/git/refs/heads/${ref.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' });}
      report.branches.push({ ref, pr: last && last.number, prState, merged, superseded, behindBy, ...v, done: v.ok && !DRY });
    } catch (e) { report.errors.push(`branch ${ref}: ${e.message}`); }
  }

  // ---- issues ----
  const issues = (await gh(`/repos/${REPO}/issues?state=open&per_page=100&sort=created&direction=desc`)).filter((i) => !i.pull_request).slice(0, MAX_ISSUES);
  for (const it of issues) {
    try {
      let comments = [];
      if (it.comments) {
        const cs = await gh(`/repos/${REPO}/issues/${it.number}/comments?per_page=30`).catch(() => []);
        comments = cs.filter((c) => !R.isBotLogin(c.user && c.user.login, c.user && c.user.type)).map((c) => c.body || '').slice(0, 30);
      }
      const r = R.classifyIssue({ number: it.number, title: it.title, body: it.body, comments, author: it.user && it.user.login, authorType: it.user && it.user.type, labels: it.labels }, index, { fixCommits: fixCommitsFor(it.number) });
      r.url = it.html_url; r.updatedAt = it.updated_at; r.draftReply = R.draftReply(r);
      report.issues.push(r);
    } catch (e) { report.errors.push(`issue #${it.number}: ${e.message}`); }
  }

  // ---- ledger + leads (additive, bounded) ----
  const seen = new Date(NOW).toISOString().slice(0, 10);
  const leads = [];
  for (const r of report.issues) {if (r.cls === 'new-couple') {for (const c of r.couples) {leads.push(R.leadFromCouple(c, r.url, seen));}}}
  for (const x of report.external) {for (const c of x.couples) {leads.push(R.leadFromCouple(c, `https://github.com/${REPO}/pull/${x.number}`, seen));}}
  report.leadsQueued = leads.filter(Boolean).length;
  report.ledger = { written: 0 };
  if (!DRY) {
    const leadFile = path.join(ROOT, 'data/leads/github-leads.json');
    let lf = { leads: [] };
    try { lf = JSON.parse(fs.readFileSync(leadFile, 'utf8')); } catch { /* new file */ }
    const m = R.mergeLeads(lf.leads, leads);
    if (m.added) { lf.leads = m.leads; fs.writeFileSync(leadFile, `${JSON.stringify(lf, null, 1)}\n`); }
    report.leadsAdded = m.added;

    const ledgerLib = require('../lib/ledger');
    const intake = require('../progress/ledger-intake');
    const L = ledgerLib.load();
    const mfrs = (cs) => [...new Set(cs.map((c) => c.mfr))].slice(0, 8);
    const pids = (cs) => [...new Set(cs.map((c) => c.pid).filter(Boolean))].slice(0, 8);
    for (const r of report.issues.slice(0, 40)) {
      if (r.cls === 'tracking') {continue;}
      const status = r.actionable ? 'pending' : 'deferred';
      const note = `${r.cls}${r.why ? `: ${r.why}` : ''}; owner replies (draft in autopilot report), never auto-closed`;
      const s = intake.upsert(L, `autopilot-issue:${r.number}`, { status, note, by: 'repo-autopilot', fields: { kind: r.cls, author: r.author, link: r.url, mfrs: mfrs(r.couples), pids: pids(r.couples), drivers: [...new Set(r.couples.flatMap((c) => c.drivers))].slice(0, 8), counts: { dps: r.dps.length, diag: r.diagIds.length, fixCommits: r.fixCommits.length } } });
      if (s === 'new' || s === 'changed') {report.ledger.written++;}
    }
    for (const x of report.external.slice(0, 20)) {
      const s = intake.upsert(L, `autopilot-pr:${x.number}`, { status: 'pending', note: `external PR: ${x.newCouples} new exact couple(s) queued to strict-apply; rest needs owner review; never auto-closed`, by: 'repo-autopilot', fields: { kind: 'external-pr', author: x.author, link: `https://github.com/${REPO}/pull/${x.number}`, mfrs: mfrs(x.couples), pids: pids(x.couples), drivers: x.drivers.slice(0, 8), counts: { files: x.files, tests: x.tests, workflows: x.workflows } } });
      if (s === 'new' || s === 'changed') {report.ledger.written++;}
    }
    for (const p of report.prs.filter((q) => q.done)) {
      intake.upsert(L, `autopilot-pr:${p.number}`, { status: 'done', note: `${p.action}: ${p.reason}`, by: 'repo-autopilot', fields: { kind: `bot-pr-${p.action}` } });
      report.ledger.written++;
    }
    intake.recordRunSummary('repo-autopilot', { ok: report.errors.length === 0, closed: report.prs.filter((q) => q.action === 'close' && q.done).length, merged: report.prs.filter((q) => q.action === 'merge' && q.done).length, branchesDeleted: report.branches.filter((b) => b.done).length, issues: report.issues.length, external: report.external.length, leadsAdded: report.leadsAdded }, L, { runId: process.env.GITHUB_RUN_ID });
    ledgerLib.save(L);
  }

  // ---- report ----
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'autopilot-report.json'), `${JSON.stringify(report, null, 1)}\n`);
  fs.writeFileSync(path.join(OUT, 'autopilot-report.md'), renderMd(report));
  if (process.env.GITHUB_STEP_SUMMARY) {fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderMd(report));}
  console.log(renderMd(report));
}

function renderMd(r) {
  const L = [`# Repo autopilot ${r.dry ? '(dry run)' : ''} — ${r.generated}`, '', '## Pull requests', '| PR | branch | origin | behind | decision | reason |', '|---|---|---|---|---|---|'];
  for (const p of r.prs) {L.push(`| #${p.number} | \`${p.headRef}\` | ${p.origin} | ${p.behindBy ?? '—'} | ${p.action}${p.done ? ' ✔' : ''} | ${p.reason} |`);}
  if (!r.prs.length) {L.push('| — | no open PR | | | | |');}
  L.push('', '## Bot branches', '| branch | PR | delete | reason |', '|---|---|---|---|');
  for (const b of r.branches) {L.push(`| \`${b.ref}\` | ${b.pr ? `#${b.pr}` : '—'} | ${b.ok ? (b.done ? 'deleted' : 'would delete') : 'keep'} | ${b.reason} |`);}
  L.push('', '## External contributor PRs (never closed)');
  for (const x of r.external) {L.push(`- #${x.number} by @${x.author}: ${x.files} files, ${x.tests} tests, ${x.newCouples} new exact couple(s) → strict-apply lead`);}
  if (!r.external.length) {L.push('- none open');}
  L.push('', '## Issues (never closed, never commented)', '| # | class | couples | symptoms | fix commits |', '|---|---|---|---|---|');
  for (const i of r.issues) {L.push(`| #${i.number} | ${i.cls} | ${i.couples.map((c) => `${c.mfr}${c.pid ? `/${c.pid}` : ''}:${c.status}`).join(' ') || '—'} | ${i.symptoms.join(', ') || '—'} | ${i.fixCommits.map((s) => s.slice(0, 10)).join(' ') || '—'} |`);}
  L.push('', '### Draft replies (not posted)');
  for (const i of r.issues) {if (i.draftReply) {L.push(`- #${i.number}: ${i.draftReply}`);}}
  L.push('', `Leads queued: ${r.leadsQueued}${r.leadsAdded != null ? `, added: ${r.leadsAdded}` : ''}. Errors: ${r.errors.length ? r.errors.join('; ') : 'none'}.`, '');
  return L.join('\n');
}

if (require.main === module) {main().catch((e) => { console.error(`repo-autopilot: ${e.message}`); process.exitCode = 1; });}
module.exports = { renderMd };
