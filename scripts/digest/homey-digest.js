'use strict';
/**
 * scripts/digest/homey-digest.js — replaces the "Homey digest matin" Grok routine.
 * Collects (both branches master / stable-v5): app.json + .homeycompose/app.json versions,
 * tip SHA, CI status of the last push that was NOT [skip ci], open PRs/issues, and the
 * latest gmail-diagnostics / fetch-diags results. Diffs vs the previous state stored in the
 * tracking issue and posts ONE comment only if something changed.
 *
 * Env: DIAG_REPORT_DIR (optional) = folder holding the downloaded
 *      sanitized-diagnostics-report artifact (diagnostics-report.json).
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');

const REPO = process.env.HOMEY_REPO || 'dlnraja/com.tuya.zigbee';
const BRANCHES = (process.env.HOMEY_BRANCHES || 'master,stable-v5').split(',');
const DIAG_WORKFLOWS = ['gmail-diagnostics.yml', 'fetch-diags.yml'];

const SKIP_RE = /\[(skip ci|ci skip|no ci|skip actions|actions skip)\]/i;

async function ciOf(sha) {
  const cr = await L.gh(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
  const runs = (cr.check_runs || []);
  const failed = runs.filter((r) => ['failure', 'timed_out', 'startup_failure', 'action_required'].includes(r.conclusion)).map((r) => r.name);
  const pending = runs.filter((r) => r.status !== 'completed').length;
  const ok = runs.filter((r) => r.conclusion === 'success').length;
  const status = !runs.length ? 'none' : failed.length ? 'red' : pending ? 'pending' : 'green';
  return { status, total: runs.length, ok, pending, failed: failed.slice(0, 15) };
}

async function branchInfo(b) {
  const commits = await L.gh(`/repos/${REPO}/commits?sha=${b}&per_page=40`);
  const tip = commits[0];
  // last push that was not [skip ci] AND actually got checks (merge/sync commits may have none)
  let lastReal = null; let lastCi = null;
  for (const c of commits.filter((x) => !SKIP_RE.test(x.commit.message)).slice(0, 5)) {
    const ci = await ciOf(c.sha);
    if (!lastReal) { lastReal = c; lastCi = ci; }
    if (ci.total) { lastReal = c; lastCi = ci; break; }
  }
  const ver = {};
  for (const f of ['app.json', '.homeycompose/app.json']) {
    try { const j = JSON.parse(await L.fileAt(REPO, tip.sha, f)); ver[f] = `${j.id}@${j.version}`; } catch (_) { ver[f] = 'n/a'; }
  }
  return {
    tip: tip.sha,
    tipMsg: tip.commit.message.split('\n')[0].slice(0, 90),
    tipDate: tip.commit.committer.date,
    versions: ver,
    lastPush: lastReal ? { sha: lastReal.sha, msg: lastReal.commit.message.split('\n')[0].slice(0, 90), ci: lastCi } : null,
  };
}

async function openItems() {
  // Search API counts PRs and issues separately in 2 calls.
  const q = async (type) => L.gh(`/search/issues?q=${encodeURIComponent(`repo:${REPO} is:open is:${type}`)}&per_page=30&sort=updated`);
  const [prs, iss] = await Promise.all([q('pr'), q('issue')]);
  const m = (i) => ({ n: i.number, t: i.title.slice(0, 80), u: i.user && i.user.login });
  const isBot = (i) => (i.labels || []).some((l) => l.name === 'bot-digest');
  return { prs: { count: prs.total_count, items: prs.items.map(m) }, issues: { count: iss.total_count - iss.items.filter(isBot).length, items: iss.items.filter((i) => !isBot(i)).map(m) } };
}

async function diags() {
  const out = {};
  for (const wf of DIAG_WORKFLOWS) {
    try {
      // no status filter (filtered lists can be stale/unsorted): take newest completed of the last 10
      const r = await L.gh(`/repos/${REPO}/actions/workflows/${wf}/runs?per_page=10`);
      const run = (r.workflow_runs || []).filter((x) => x.status === 'completed').sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
      out[wf] = run ? { id: run.id, conclusion: run.conclusion, at: run.updated_at, url: run.html_url } : null;
    } catch (e) { out[wf] = { error: e.message.slice(0, 100) }; }
  }
  const dir = process.env.DIAG_REPORT_DIR;
  if (dir) {
    const f = [path.join(dir, 'diagnostics-report.json'), path.join(dir, '.github/state/diagnostics-report.json')].find((p) => fs.existsSync(p));
    if (f) {
      try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        out.report = { at: j.timestamp, count: j.count || 0, byType: j.byType || {}, newFingerprints: (j.newFingerprints || []).slice(0, 25) };
      } catch (e) { L.log('diag report unreadable', e.message); }
    }
  }
  return out;
}

function diffLines(prev, cur) {
  const lines = [];
  if (!prev) return ['Premier passage : état initial enregistré.'];
  for (const b of BRANCHES) {
    const p = prev.branches && prev.branches[b];
    const c = cur.branches[b];
    if (!c) continue;
    if (!p) { lines.push(`**${b}** : nouvelle branche suivie.`); continue; }
    for (const f of Object.keys(c.versions)) if (p.versions[f] !== c.versions[f]) lines.push(`**${b}** \`${f}\` : ${p.versions[f]} → **${c.versions[f]}**`);
    if (p.tip !== c.tip) lines.push(`**${b}** tip : \`${L.short(p.tip)}\` → \`${L.short(c.tip)}\` — ${L.esc(c.tipMsg)}`);
    const pc = p.lastPush && p.lastPush.ci.status; const cc = c.lastPush && c.lastPush.ci.status;
    if (pc !== cc || (p.lastPush && c.lastPush && p.lastPush.sha !== c.lastPush.sha && cc === 'red')) lines.push(`**${b}** CI (dernier push hors skip-ci \`${L.short(c.lastPush && c.lastPush.sha)}\`) : ${pc || '?'} → **${cc}**${cc === 'red' ? ' — ' + c.lastPush.ci.failed.map(L.esc).join(', ') : ''}`);
  }
  const setDiff = (a, b) => b.filter((x) => !a.some((y) => y.n === x.n));
  for (const k of ['prs', 'issues']) {
    const p = prev.open[k]; const c = cur.open[k];
    const added = setDiff(p.items, c.items); const gone = setDiff(c.items, p.items);
    if (p.count !== c.count || added.length || gone.length) {
      lines.push(`${k === 'prs' ? 'PR' : 'Issues'} ouvertes : ${p.count} → **${c.count}**` +
        (added.length ? `\n  - ➕ ${added.map((i) => `#${i.n} ${L.esc(i.t)}`).join('\n  - ➕ ')}` : '') +
        (gone.length ? `\n  - ✔️ fermées : ${gone.map((i) => '#' + i.n).join(', ')}` : ''));
    }
  }
  for (const wf of DIAG_WORKFLOWS) {
    const p = prev.diags && prev.diags[wf]; const c = cur.diags[wf];
    if (c && c.id && (!p || p.id !== c.id) && (c.conclusion !== 'success' || (p && p.conclusion !== 'success'))) lines.push(`\`${wf}\` : dernière exécution **${c.conclusion}** (${L.paris(c.at)}) ${c.url}`);
  }
  const pr = prev.diags && prev.diags.report; const cr = cur.diags.report;
  if (cr && (!pr || pr.at !== cr.at) && cr.count > 0) {
    const newFp = cr.newFingerprints.filter((f) => !(pr && pr.newFingerprints || []).includes(f));
    lines.push(`📬 Diags Gmail : ${cr.count} rapport(s) (${Object.entries(cr.byType).map(([k, v]) => `${k}:${v}`).join(', ') || '—'})` + (newFp.length ? ` — nouveaux FP non supportés : ${newFp.map((f) => '`' + L.esc(f) + '`').join(', ')}` : ''));
  }
  return lines;
}

function snapshot(cur) {
  const rows = BRANCHES.map((b) => {
    const c = cur.branches[b];
    if (!c) return `| ${b} | n/a | | |`;
    const ci = c.lastPush ? `${{ green: '🟢', red: '🔴', pending: '🟡', none: '⚪' }[c.lastPush.ci.status]} ${c.lastPush.ci.status} (${c.lastPush.ci.ok}/${c.lastPush.ci.total})` : '—';
    const va = c.versions['app.json'].split('@')[1]; const vc = c.versions['.homeycompose/app.json'].split('@')[1];
    return `| ${b} | ${c.versions['app.json']} / compose ${vc || 'n/a'}${va && vc && va !== vc ? ' ⚠️ drift' : ''} | \`${L.short(c.tip)}\` ${L.paris(c.tipDate)} | ${ci} |`;
  });
  return ['| Branche | Version (app.json / compose) | Tip | CI dernier push |', '|---|---|---|---|', ...rows,
    '', `PR ouvertes : **${cur.open.prs.count}** · Issues ouvertes : **${cur.open.issues.count}**`,
    '', 'Diags : ' + DIAG_WORKFLOWS.map((wf) => { const d = cur.diags[wf]; return `\`${wf}\` ${d && d.conclusion ? `${d.conclusion === 'success' ? '🟢' : '🔴'} ${d.conclusion} (${L.paris(d.at)})` : '—'}`; }).join(' · ') +
      (cur.diags.report ? ` · rapport Gmail : ${cur.diags.report.count} diag(s), ${cur.diags.report.newFingerprints.length} FP non supporté(s)` : '')].join('\n');
}

(async () => {
  const { issue, prev } = await L.loadState('homey');
  const cur = { at: new Date().toISOString(), branches: {}, open: await openItems(), diags: await diags() };
  for (const b of BRANCHES) {
    try { cur.branches[b] = await branchInfo(b); } catch (e) { L.log(`branch ${b}: ${e.message}`); }
  }
  const changes = diffLines(prev, cur);
  const md = `## 🏠 Homey digest — ${L.paris(cur.at)}\n\n### Changements depuis le dernier passage\n${changes.length ? changes.map((l) => '- ' + l).join('\n') : '_aucun_'}\n\n### État\n${snapshot(cur)}\n\n<sub>daily-digest.yml · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  if (changes.length || L.FORCE) await L.postComment(issue, md);
  else console.log('No change — silent.');
  // keep state small: drop item titles beyond 30
  await L.saveState(issue, 'homey', cur);
})().catch((e) => { console.error(e); process.exit(1); });
