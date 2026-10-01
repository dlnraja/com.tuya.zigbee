'use strict';
/**
 * scripts/digest/weekly.js — Monday summary on the tracking issue + per-driver health score.
 * Deterministic, report-only. Inputs (all optional, best-effort):
 *   - own repo issues/PRs (last 7 days + open issues)          → GitHub API (≤ 6 calls)
 *   - WEEKLY_DIAG_DIR  : downloaded sanitized diagnostics artifact (crash / error mentions)
 *   - WEEKLY_LEADS_DIR : downloaded digest-leads artifacts of the week (unmapped couples)
 *   - QUIRKS_DB        : firmware-quirk dataset (confirmed quirks)
 *   - tracking-issue state: ci (red workflows), ci._store (Test channel version)
 * Health score per driver (0–100, higher = healthier):
 *   100 − 6·open issues − 10·crash mentions − 4·confirmed quirks − 1·heuristic quirks − 2·partial couples
 *   (partial couple = manufacturerName handled by the driver but reported with another productId)
 */
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const E = require('./enrich');

const walkJson = (dir, cb) => { let e = []; try { e = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; } for (const x of e) { const p = path.join(dir, x.name); if (x.isDirectory()) walkJson(p, cb); else if (x.name.endsWith('.json')) { try { cb(JSON.parse(fs.readFileSync(p, 'utf8')), p); } catch { /* skip */ } } } };
const MFR_RE = /_(?:TZ[0-9A-Z]{4}|TZE[0-9]{3}|TYZB0[0-9]|TYST11|TZB[0-9]{3})_[a-z0-9]{8}/gi;

L.run(async () => {
  const { issue, prev } = await L.loadState('weekly');
  const ci = (await L.loadState('ci')).prev || {};
  const idx = E.buildIndex(process.cwd());
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const score = {}; const S = (d) => (score[d] = score[d] || { issues: 0, crash: 0, qc: 0, qh: 0, partial: 0 });
  const drvOfMfr = (m) => idx.mfr[String(m).toLowerCase()] || [];

  // 1) issues & PRs
  let opened = 0, closed = 0, prsMerged = 0; const openIssues = [];
  for (let page = 1; page <= 3; page++) {
    const list = await L.gh(`/repos/${L.REPO}/issues?state=all&since=${encodeURIComponent(since)}&per_page=100&page=${page}`);
    for (const it of list) {
      if ((it.labels || []).some((l) => l.name === 'bot-digest')) continue;
      if (it.pull_request) { if (it.pull_request.merged_at && it.pull_request.merged_at >= since) prsMerged++; continue; }
      if (it.created_at >= since) opened++;
      if (it.closed_at && it.closed_at >= since) closed++;
    }
    if (list.length < 100) break;
  }
  for (let page = 1; page <= 2; page++) {
    const list = await L.gh(`/repos/${L.REPO}/issues?state=open&per_page=100&page=${page}`);
    for (const it of list) if (!it.pull_request && !(it.labels || []).some((l) => l.name === 'bot-digest')) openIssues.push(it);
    if (list.length < 100) break;
  }
  for (const it of openIssues) {
    const ds = new Set(); for (const m of `${it.title}\n${it.body || ''}`.match(MFR_RE) || []) drvOfMfr(m).forEach((d) => ds.add(d));
    ds.forEach((d) => S(d).issues++);
  }
  // 2) diagnostics (crash / error mentions)
  if (process.env.WEEKLY_DIAG_DIR) walkJson(process.env.WEEKLY_DIAG_DIR, (j) => {
    const txt = JSON.stringify(j);
    for (const m of new Set((txt.match(MFR_RE) || []).map((x) => x.toLowerCase()))) drvOfMfr(m).forEach((d) => S(d).crash++);
  });
  // 3) unmapped / partial couples from the week's leads
  const partialSeen = new Set(); let unmappedCouples = 0;
  if (process.env.WEEKLY_LEADS_DIR) walkJson(process.env.WEEKLY_LEADS_DIR, (j) => {
    for (const r of j.records || []) for (const c of r.couples || []) {
      const k = `${c.mfr}|${c.pid}`.toLowerCase(); if (partialSeen.has(k)) continue; partialSeen.add(k);
      const ds = drvOfMfr(c.mfr);
      if (!ds.length) { unmappedCouples++; continue; }
      const withPid = new Set(idx.pid[String(c.pid).toUpperCase()] || []);
      if (!ds.some((d) => withPid.has(d))) ds.forEach((d) => S(d).partial++);
    }
  });
  // 4) quirks
  try {
    const q = JSON.parse(fs.readFileSync(process.env.QUIRKS_DB || '.quirks-db/quirks.json', 'utf8'));
    for (const [k, v] of Object.entries(q.pairs || {})) for (const qq of Object.values(v.quirks || {})) drvOfMfr(k.split('|')[0]).forEach((d) => (qq.heuristic ? S(d).qh++ : S(d).qc++));
  } catch { /* no dataset yet */ }
  const rows = Object.entries(score).map(([d, s]) => ({ d, ...s, score: Math.max(0, 100 - 6 * s.issues - 10 * s.crash - 4 * s.qc - s.qh - 2 * s.partial) })).sort((a, b) => a.score - b.score);
  const red = ['master', 'stable-v5'].map((b) => `${b} ${Object.keys((ci[b] && ci[b].red) || {}).length} 🔴`).join(' · ');
  const store = ci._store || {};
  const md = `## 📅 Résumé hebdomadaire — semaine du ${L.paris(since).slice(0, 10)}\n\n` +
    `- Issues : **${opened}** ouvertes · **${closed}** fermées · ${openIssues.length} encore ouvertes\n- PR mergées : **${prsMerged}**\n` +
    `- CI : ${red}\n- Canal Test : v${store.test || '?'}${prev && prev.test && prev.test !== store.test ? ` (semaine précédente v${prev.test})` : ''} · master v${store.master || '?'}\n` +
    `- Couples signalés non couverts par un driver (semaine) : ${unmappedCouples}\n\n` +
    (rows.length ? `### Santé des drivers (10 plus fragiles)\n| Driver | Score | Issues ouvertes | Diag | Quirks (confirmés/heur.) | Couples partiels |\n|---|---|---|---|---|---|\n${rows.slice(0, 10).map((r) => `| \`${r.d}\` | ${r.score} | ${r.issues} | ${r.crash} | ${r.qc}/${r.qh} | ${r.partial} |`).join('\n')}\n\n` : '') +
    `<sub>Score = 100 − 6·issues − 10·mentions diag − 4·quirks confirmés − 1·quirks heuristiques − 2·couples partiels. Rapport seul. daily-digest.yml (weekly) · run ${process.env.GITHUB_RUN_ID || 'local'}</sub>`;
  L.summary(md);
  await L.postComment(issue, md);
  await L.saveState(issue, 'weekly', { at: new Date().toISOString(), test: store.test || null });
});
