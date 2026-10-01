'use strict';
/**
 * scripts/digest/ci-health.js — replaces the "Homey CI health" Grok routine.
 * For master and stable-v5: latest completed (non-cancelled/skipped) run of every workflow
 * on the branch + tip check-runs. Keeps the set of red workflows in the tracking-issue state
 * and comments ONLY on transitions (newly red, with failed job names / recovered).
 * Also exported for digest-event.js (real-time workflow_run listener).
 * Env: CI_DAYS (7) · CI_PAGES (3, max 5) · CI_BRANCHES (master,stable-v5) · CI_IGNORE (regex of workflow names to ignore)
 */
const L = require('./lib');
const REPO = process.env.HOMEY_REPO || L.REPO;
const BRANCHES = (process.env.CI_BRANCHES || 'master,stable-v5').split(',');
const IGNORE = process.env.CI_IGNORE ? new RegExp(process.env.CI_IGNORE) : null;
const BAD = ['failure', 'timed_out', 'startup_failure'];
const DAYS = Number(process.env.CI_DAYS || 7);   // look-back window
const PAGES = Math.min(Number(process.env.CI_PAGES || 3), 5); // ≤300 runs per branch (hard cap 5)

async function failedJobs(runId) {
  try {
    const j = await L.gh(`/repos/${REPO}/actions/runs/${runId}/jobs?filter=latest&per_page=50`);
    return (j.jobs || []).filter((x) => BAD.includes(x.conclusion)).map((x) => {
      const step = (x.steps || []).find((s) => BAD.includes(s.conclusion));
      return step ? `${x.name} › ${step.name}` : x.name;
    }).slice(0, 8);
  } catch (e) { return [`(jobs: ${e.message.slice(0, 60)})`]; }
}

async function branchHealth(branch) {
  // NB: without a `created` filter the branch-filtered list is NOT sorted by recency.
  const since = new Date(Date.now() - DAYS * 864e5).toISOString().slice(0, 10);
  const all = [];
  for (let page = 1; page <= PAGES; page++) {
    const j = await L.gh(`/repos/${REPO}/actions/runs?branch=${encodeURIComponent(branch)}&per_page=100&page=${page}&created=${encodeURIComponent('>=' + since)}`);
    all.push(...(j.workflow_runs || []));
    if ((j.workflow_runs || []).length < 100) break;
  }
  all.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = {};
  for (const r of all) {
    if (r.status !== 'completed' || ['cancelled', 'skipped', 'neutral'].includes(r.conclusion)) continue;
    if (r.event === 'pull_request' || r.event === 'pull_request_target') continue;
    if (IGNORE && IGNORE.test(r.name)) continue;
    if (!latest[r.name]) latest[r.name] = { id: r.id, conclusion: r.conclusion, sha: r.head_sha, at: r.updated_at, url: r.html_url, event: r.event };
  }
  const red = {};
  for (const [name, r] of Object.entries(latest)) if (BAD.includes(r.conclusion)) red[name] = { ...r, jobs: await failedJobs(r.id) };
  const [tip] = await L.gh(`/repos/${REPO}/commits?sha=${encodeURIComponent(branch)}&per_page=1`);
  const cr = await L.gh(`/repos/${REPO}/commits/${tip.sha}/check-runs?per_page=100`);
  const tipFailed = (cr.check_runs || []).filter((c) => BAD.includes(c.conclusion)).map((c) => c.name);
  return { tip: tip.sha, tipChecks: (cr.check_runs || []).length, tipFailed, green: Object.keys(latest).length - Object.keys(red).length, red };
}

function transitions(prev, cur) {
  const lines = [];
  for (const b of Object.keys(cur).filter((k) => !k.startsWith('_'))) {
    const p = (prev && prev[b] && prev[b].red) || {};
    const c = cur[b].red;
    for (const [n, r] of Object.entries(c)) {
      if (!p[n]) lines.push(`🔴 **${b}** · _${L.esc(n)}_ (${r.event}, \`${L.short(r.sha)}\`, ${L.paris(r.at)}) — ${r.jobs.map(L.esc).join(' ; ') || 'job ?'} — ${r.url}`);
    }
    for (const n of Object.keys(p)) if (!c[n]) lines.push(`🟢 **${b}** · _${L.esc(n)}_ est repassé au vert`);
  }
  return lines;
}

function table(cur) {
  return ['| Branche | Tip | Checks tip en échec | Workflows 🟢 / 🔴 |', '|---|---|---|---|',
    ...Object.entries(cur).filter(([b]) => !b.startsWith('_')).map(([b, c]) => `| ${b} | \`${L.short(c.tip)}\` | ${c.tipFailed.length ? c.tipFailed.map(L.esc).join(', ') : `0/${c.tipChecks}`} | ${c.green} / ${Object.keys(c.red).length}${Object.keys(c.red).length ? ' (' + Object.keys(c.red).map(L.esc).join(', ') + ')' : ''} |`)].join('\n');
}

async function main() {
  const { issue, prev } = await L.loadState('ci');
  const cur = {};
  for (const b of BRANCHES) { try { cur[b] = await branchHealth(b); } catch (e) { L.log(`${b}: ${e.message}`); if (prev && prev[b]) cur[b] = prev[b]; } }
  // CI event lines buffered by digest-event.js burst dedupe: their red/green is already in prev,
  // so transitions() won't repeat them — prepend them so they are not lost.
  const pending = (prev && prev._events && prev._events.pending) || [];
  const lines = [...pending, ...(prev ? transitions(prev, cur) : [])];
  if (pending.length) L.log(`flushing ${pending.length} buffered event line(s)`);
  cur._events = { lastAt: (prev && prev._events && prev._events.lastAt) || null, pending: [] };
  const md = `## 🩺 CI health — ${L.paris(new Date().toISOString())}\n\n${lines.length ? lines.map((l) => '- ' + l).join('\n') : (prev ? '_aucune transition_' : 'Premier passage : état initial enregistré.')}\n\n${table(cur)}\n\n<sub>autonomous-verification.yml (ci-health) · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (lines.length || L.FORCE) await L.postComment(issue, md); else console.log('No CI transition — silent.');
  await L.saveState(issue, 'ci', cur);
}

module.exports = { failedJobs, BAD };
if (require.main === module) L.run(main);
