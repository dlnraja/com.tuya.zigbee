'use strict';
/**
 * scripts/digest/labs-digest.js — replaces the "Labs digest" Grok routine (AscendOS + Pulse).
 * Cross-repo PUBLIC reads only (GITHUB_TOKEN of the host repo can read public repos):
 * tip commit, latest run per workflow (deploy status), open issues/PRs. Comment only on change.
 * Env: LABS_REPOS (default dlnraja/ascendos,dlnraja/pulse-automix)
 */
const L = require('./lib');
const REPOS = (process.env.LABS_REPOS || 'dlnraja/ascendos,dlnraja/pulse-automix').split(',');
const ICON = { success: '🟢', failure: '🔴', cancelled: '⚪', skipped: '⚪', timed_out: '🔴', startup_failure: '🔴', action_required: '🟡' };

async function repoInfo(repo) {
  const meta = await L.gh(`/repos/${repo}`, { allow404: true });
  if (!meta) return { error: 'introuvable ou privé' };
  const [c] = await L.gh(`/repos/${repo}/commits?sha=${meta.default_branch}&per_page=1`);
  const runs = await L.gh(`/repos/${repo}/actions/runs?branch=${meta.default_branch}&per_page=50`);
  const latest = {};
  for (const r of runs.workflow_runs || []) {
    if (latest[r.name] || r.status !== 'completed') continue;
    latest[r.name] = { id: r.id, conclusion: r.conclusion, sha: r.head_sha, at: r.updated_at, url: r.html_url };
  }
  const q = async (type) => L.gh(`/search/issues?q=${encodeURIComponent(`repo:${repo} is:open is:${type}`)}&per_page=20&sort=updated`);
  const [prs, iss] = [await q('pr'), await q('issue')];
  const m = (i) => ({ n: i.number, t: i.title.slice(0, 80) });
  return {
    private: meta.private, branch: meta.default_branch,
    tip: c.sha, tipMsg: c.commit.message.split('\n')[0].slice(0, 90), tipDate: c.commit.committer.date,
    workflows: latest,
    prs: { count: prs.total_count, items: prs.items.map(m) }, issues: { count: iss.total_count, items: iss.items.map(m) },
  };
}

function diff(prev, cur) {
  const out = [];
  if (!prev) return ['Premier passage : état initial enregistré.'];
  for (const repo of REPOS) {
    const p = prev[repo]; const c = cur[repo];
    if (!c || c.error) { if (!p || !p.error) out.push(`**${repo}** : ${c ? c.error : 'erreur'}`); continue; }
    if (!p || p.error) { out.push(`**${repo}** : suivi (ré)activé.`); continue; }
    if (p.tip !== c.tip) out.push(`**${repo}** nouveau commit \`${L.short(c.tip)}\` — ${L.esc(c.tipMsg)} (${L.paris(c.tipDate)})`);
    for (const [name, w] of Object.entries(c.workflows)) {
      const pw = p.workflows[name];
      if (!pw || pw.conclusion !== w.conclusion) out.push(`**${repo}** workflow _${L.esc(name)}_ : ${pw ? pw.conclusion : '—'} → ${ICON[w.conclusion] || ''} **${w.conclusion}** ${w.url}`);
    }
    for (const k of ['prs', 'issues']) {
      const added = c[k].items.filter((x) => !p[k].items.some((y) => y.n === x.n));
      if (p[k].count !== c[k].count || added.length) out.push(`**${repo}** ${k === 'prs' ? 'PR' : 'issues'} ouvertes ${p[k].count} → **${c[k].count}**${added.length ? ' — ' + added.map((i) => `#${i.n} ${L.esc(i.t)}`).join(' · ') : ''}`);
    }
  }
  return out;
}

function table(cur) {
  const rows = REPOS.map((r) => {
    const c = cur[r];
    if (!c || c.error) return `| ${r} | ${c ? c.error : '?'} | | |`;
    const wf = Object.entries(c.workflows).map(([n, w]) => `${ICON[w.conclusion] || '❔'} ${L.esc(n)}`).join('<br>') || '— (aucun workflow)';
    return `| ${r} | \`${L.short(c.tip)}\` ${L.paris(c.tipDate)} | ${wf} | ${c.prs.count} PR / ${c.issues.count} issues |`;
  });
  return ['| Repo | Tip | Dernier run par workflow | Ouverts |', '|---|---|---|---|', ...rows].join('\n');
}

(async () => {
  const { issue, prev } = await L.loadState('labs');
  const cur = {};
  for (const r of REPOS) { try { cur[r] = await repoInfo(r); } catch (e) { cur[r] = { error: e.message.slice(0, 120) }; } }
  const changes = diff(prev, cur);
  const md = `## 🧪 Labs digest (AscendOS / Pulse) — ${L.paris(new Date().toISOString())}\n\n### Changements\n${changes.length ? changes.map((l) => '- ' + l).join('\n') : '_aucun_'}\n\n### État\n${table(cur)}\n\n<sub>daily-digest.yml · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (changes.length || L.FORCE) await L.postComment(issue, md); else console.log('No change — silent.');
  await L.saveState(issue, 'labs', cur);
})().catch((e) => { console.error(e); process.exit(1); });
