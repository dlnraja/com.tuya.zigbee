#!/usr/bin/env node
'use strict';
/**
 * Free weekday self-check → ONE section of the "🤖 Daily digest" tracking issue body.
 *
 * - Owns only the state key `selfcheck`; lib.renderBody() renders it between
 *   <!-- self-check:BEGIN --> and <!-- self-check:END --> so other digests keep it.
 * - Never posts a comment (no e-mail), never commits, never publishes.
 * - Writes only when the report fingerprint changes (or DIGEST_FORCE=1 / FORCE=true).
 * - Budget: ≤ ~20 GitHub API calls (one commits page + one runs page per watched workflow).
 *
 * Sections:
 *   1. history sweep checkpoint progress (local files)
 *   2. scheduled producers: last scheduled run conclusion vs. commits carrying their tag in the
 *      last 72 h → flags "green but produced nothing"
 *   3. continuous-flow scheduled dry-run: last conclusion (kept on purpose, see WORKFLOW_AUDIT)
 *
 * Local test: DIGEST_DRY_RUN=1 DIGEST_USE_GH_CLI=1 node scripts/digest/self-check.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./lib');

const ROOT = path.join(__dirname, '../..');
const FORCE = L.FORCE || String(process.env.FORCE || '') === 'true';
const WINDOW_H = 72;

// workflow file → regex matching the commit subject it produces when it has something to write.
// A third element marks workflows that are report-only by design (artifacts, no push step).
const PRODUCERS = [
  ['auto-enrich-closed-loop.yml', /auto-enrich closed loop/i, 'report-only: commits locally, no push step; outputs = artifact'],
  ['fleet-intelligent-enrich.yml', /auto:fleet-enrich/],
  ['market-couples-intake.yml', /auto:market|market\(P/],
  ['oss-lan-source-enrich.yml', /P2658|auto:strict-apply|auto:github-leads|auto:image-ocr/],
  ['johan-thread-intel.yml', /auto:johan-thread-int|auto:history-sweep/],
  ['blakadder-fetch.yml', /^blakadder\(/],
  ['free-scrape-crossref.yml', /registry ingestion cursors/],
  ['l99-inbox-intelligence.yml', /L99 inbox intelligence/],
  ['project-resilience.yml', /chore\(resilience\)/],
  ['community-inbox.yml', /community inbox digest/],
  ['bastien-promote-upstream.yml', /Bastien.master promote/],
];

function load(p, fb) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); } catch { return fb; } }

function sweepLines() {
  const sweep = load('data/leads/sweep-checkpoint.json', {});
  const deep = load('data/leads/deep-read-checkpoint.json', {});
  const nextJ = (sweep.github && sweep.github.johan && sweep.github.johan.next) || (deep.next && deep.next.JohanBendz) || '?';
  const items = Array.isArray(sweep.items) ? sweep.items : [];
  const by = items.reduce((a, it) => { a[it.status] = (a[it.status] || 0) + 1; return a; }, {});
  const threads = Object.entries(sweep.threads || {}).map(([t, v]) => `${t}@${v.lastPost}`).join(', ');
  return [
    `- History sweep: Johan next **#${nextJ}**; items ${JSON.stringify(by)}; forum ${threads || 'n/a'} (checkpoint ${sweep.updated ? sweep.updated.slice(0, 10) : 'n/a'}).`,
  ];
}

async function lastScheduledRun(file) {
  const j = await L.gh(`/repos/${L.REPO}/actions/workflows/${file}/runs?per_page=1&event=schedule`, { allow404: true });
  const r = j && j.workflow_runs && j.workflow_runs[0];
  return r ? { conclusion: r.conclusion || r.status, at: r.created_at, url: r.html_url } : null;
}

async function producerLines() {
  const since = new Date(Date.now() - WINDOW_H * 3600e3).toISOString();
  const commits = (await L.gh(`/repos/${L.REPO}/commits?sha=master&since=${since}&per_page=100`)) || [];
  const subjects = commits.map((c) => String((c.commit && c.commit.message) || '').split('\n')[0]);
  const rows = ['', `| Scheduled producer | Last scheduled run | Commits ${WINDOW_H} h | Flag |`, '|---|---|---|---|'];
  const idle = [];
  for (const [file, re, reportOnly] of PRODUCERS) {
    const run = await lastScheduledRun(file);
    const n = subjects.filter((s) => re.test(s)).length;
    let flag = '';
    if (!run) flag = 'no scheduled run';
    else if (run.conclusion !== 'success') flag = `⚠️ ${run.conclusion}`;
    else if (n === 0 && reportOnly) flag = `ℹ️ ${reportOnly}`;
    else if (n === 0) { flag = '💤 green, nothing written'; idle.push(file); }
    rows.push(`| \`${file}\` | ${run ? `[${run.conclusion}](${run.url}) ${run.at.slice(0, 16).replace('T', ' ')}Z` : '—'} | ${n} | ${flag} |`);
  }
  rows.push('', idle.length
    ? `_Idle producers are not always a bug (no new upstream data); see docs/progress/WORKFLOW_AUDIT_2026-10-10.md for the known causes._`
    : '_Every scheduled producer wrote at least once in the window._');
  return rows;
}

async function continuousFlowLines() {
  const run = await lastScheduledRun('continuous-flow.yml');
  return [
    '',
    `- continuous-flow (daily dry-run, kept: only place running the upstream-reference audit, shadow-mode v2, variant finder and multi-device detection): last **${run ? run.conclusion : 'n/a'}**${run ? ` ${run.at.slice(0, 10)}` : ''}. Apply only via workflow_dispatch \`mode=apply\`.`,
  ];
}

async function main() {
  const lines = ['### 🩺 Free self-check', ''];
  lines.push(...sweepLines());
  lines.push(...await continuousFlowLines());
  lines.push(...await producerLines());
  lines.push('', '_Section owned by `scripts/digest/self-check.js` (daily-digest › selfcheck). No comment, no commit, no publish._');
  const markdown = lines.join('\n');
  // Fingerprint ignores timestamps of runs so a re-run with the same outcome stays silent.
  const fp = crypto.createHash('sha1').update(markdown.replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}Z?/g, '').replace(/runs\/\d+/g, '')).digest('hex').slice(0, 12);
  const { issue, prev } = await L.loadState('selfcheck');
  if (!FORCE && prev && prev.fp === fp) { console.log('self-check unchanged', fp); return; }
  await L.saveState(issue, 'selfcheck', { fp, at: new Date().toISOString(), markdown });
  L.summary(markdown);
  console.log(`self-check section updated (${fp})${L.DRY ? ' [dry-run]' : ''}`);
  if (L.DRY) console.log(markdown);
}

L.run(main);
