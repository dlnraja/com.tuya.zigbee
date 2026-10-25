#!/usr/bin/env node
'use strict';
/**
 * P3048 (a) — the workflows watch themselves (deterministic, GITHUB_TOKEN only, no AI).
 *
 * For every workflow with a `schedule:` cron in .github/workflows:
 *   stale   : no scheduled run for > 2 × the cron period (+ 6 h slack), or the workflow was disabled
 *             (disabled_inactivity / disabled_manually);
 *   failing : its last 3 completed runs (any event, default branch) all failed.
 * Plus repeated real CI failures from the journal (same signature >= 3 times in 72 h).
 * Each finding -> one journal line (dedup key watch:<sig>), and at most ONE new issue per run labelled
 * `automation-watch`, one issue per signature ever while it is open (marker in the body). Never a comment,
 * never a reaction, never closes anything. vars.AUTOMATION_WATCH_ISSUES == 'false' -> journal only.
 *
 *   node scripts/automation/workflow-watchdog.cjs [--dry] [--no-issues]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');
const LABEL = 'automation-watch';

/** Rough period of a 5-field cron, in hours (upper bound between two runs). */
function cronPeriodHours(cron) {
  const f = String(cron || '').trim().split(/\s+/);
  if (f.length < 5) return null;
  const [, hour, dom, , dow] = f;
  if (dom !== '*' && !/^\*\/\d+$/.test(dom)) return 24 * 31;
  if (dow !== '*') {
    const days = dow.split(',').flatMap((x) => { const m = /^(\d)-(\d)$/.exec(x); if (m) { const a = []; for (let i = +m[1]; i <= +m[2]; i++) a.push(i); return a; } return [x]; });
    return days.length >= 5 ? 24 * 3 : Math.ceil(24 * 7 / Math.max(1, days.length));
  }
  if (hour === '*') return 1;
  const step = /^\*\/(\d+)$/.exec(hour);
  if (step) return Number(step[1]);
  const hs = hour.split(',').length;
  return Math.ceil(24 / hs);
}

function scheduledWorkflows(dir = WF_DIR) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => /\.ya?ml$/.test(x)).sort()) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!/^\s{2}schedule:\s*$/m.test(text)) continue;
    const crons = [...text.matchAll(/^\s+-\s*cron:\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    if (!crons.length) continue;
    const periods = crons.map(cronPeriodHours).filter((x) => x);
    const name = (/^name:\s*['"]?(.+?)['"]?\s*$/m.exec(text) || [])[1] || f;
    out.push({ file: f, name, crons, periodH: periods.length ? Math.min(...periods) : 24 });
  }
  return out;
}

function sigOf(...parts) { return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12); }

/** assess({ wf, state, scheduleRuns, recentRuns, now }) -> finding | null (pure, tested). */
function assess({ wf, state, scheduleRuns = [], recentRuns = [], now = Date.now() }) {
  if (state && /^disabled/.test(state)) return { kind: 'disabled', sig: sigOf('disabled', wf.file), wf: wf.file, detail: `workflow state ${state}` };
  const limitH = 2 * wf.periodH + 6;
  const last = scheduleRuns.map((r) => Date.parse(r.created_at)).filter(Number.isFinite).sort((a, b) => b - a)[0];
  const done = recentRuns.filter((r) => r.status === 'completed' && !['cancelled', 'skipped'].includes(r.conclusion));
  if (done.length >= 3 && done.slice(0, 3).every((r) => r.conclusion === 'failure')) {
    return { kind: 'failing', sig: sigOf('failing', wf.file), wf: wf.file, detail: `last 3 completed runs failed (newest ${done[0].html_url || done[0].id})` };
  }
  if (!last) return null; // never ran on schedule here (new workflow or dispatch only): no noise
  const ageH = (now - last) / 3600000;
  if (ageH > limitH) return { kind: 'stale', sig: sigOf('stale', wf.file), wf: wf.file, detail: `no scheduled run for ${Math.round(ageH)} h (expected <= ${limitH} h)` };
  return null;
}

/** Repeated real CI failures from the journal: same signature >= 3 times in 72 h (pure, tested). */
function repeatedFailures(entries, min = 3) {
  const by = new Map();
  for (const e of entries) {
    if (e.status !== 'fail' || !e.data || !e.data.sig || e.data.publish) continue;
    if (!by.has(e.data.sig)) by.set(e.data.sig, []);
    by.get(e.data.sig).push(e);
  }
  return [...by.entries()].filter(([, l]) => l.length >= min).map(([sig, l]) => ({ kind: 'repeated-failure', sig: `ci-${sig}`, wf: l[0].data.wf || l[0].data.name, detail: `${l.length} failures in 72 h: ${l[l.length - 1].summary}` }));
}

async function main() {
  const { gh, REPO } = require('./gh.cjs');
  const journal = require('./journal.cjs');
  const dry = process.argv.includes('--dry');
  const issuesOn = !process.argv.includes('--no-issues') && process.env.AUTOMATION_WATCH_ISSUES !== 'false';
  const wfs = scheduledWorkflows();
  const api = ((await gh(`/repos/${REPO}/actions/workflows?per_page=100`, { soft: true })) || {}).workflows || [];
  const byPath = new Map(api.map((w) => [path.basename(w.path), w]));
  const findings = [];
  for (const wf of wfs) {
    const w = byPath.get(wf.file);
    if (!w) continue;
    const sched = ((await gh(`/repos/${REPO}/actions/workflows/${w.id}/runs?event=schedule&per_page=3`, { soft: true })) || {}).workflow_runs || [];
    const recent = ((await gh(`/repos/${REPO}/actions/workflows/${w.id}/runs?branch=master&per_page=5`, { soft: true })) || {}).workflow_runs || [];
    const f = assess({ wf, state: w.state, scheduleRuns: sched, recentRuns: recent });
    if (f) findings.push(f);
  }
  findings.push(...repeatedFailures(journal.readSince(72)));
  let opened = 0;
  const open = issuesOn ? (((await gh(`/repos/${REPO}/issues?state=open&labels=${LABEL}&per_page=100`, { soft: true })) || [])) : [];
  for (const f of findings) {
    const key = `watch:${f.sig}`;
    const already = journal.seen(key, { hours: 24 * 7 });
    let notified = false;
    const marker = `<!-- p3048-watch:${f.sig} -->`;
    const hasIssue = open.some((i) => String(i.body || '').includes(marker));
    if (issuesOn && !dry && !hasIssue && !already && opened < 1) {
      const body = `${marker}\nAutomatic watchdog (P3048, deterministic, no AI).\n\n- workflow: \`${f.wf}\`\n- finding: **${f.kind}** — ${f.detail}\n\nOne issue per signature; it is never commented on by automation. Close it once fixed.`;
      let r = await gh(`/repos/${REPO}/issues`, { method: 'POST', soft: true, body: { title: `[automation-watch] ${f.kind}: ${f.wf}`, body, labels: [LABEL] } });
      if (!r) r = await gh(`/repos/${REPO}/issues`, { method: 'POST', soft: true, body: { title: `[automation-watch] ${f.kind}: ${f.wf}`, body } });
      if (r && r.number) { opened++; notified = true; f.issue = r.number; }
    }
    if (!dry) journal.append({ workflow: 'workflow-watchdog', status: 'warn', key, summary: `${f.kind} ${f.wf}: ${f.detail}${f.issue ? ` (issue #${f.issue})` : ''}`, notified, data: { sig: f.sig, kind: f.kind, wf: f.wf } });
  }
  if (!dry) journal.append({ workflow: 'workflow-watchdog', status: findings.length ? 'warn' : 'ok', key: `watchdog-run:${new Date().toISOString().slice(0, 10)}`, summary: `${wfs.length} scheduled workflows checked, ${findings.length} finding(s), ${opened} issue(s) opened` });
  const md = `### Workflow watchdog (P3048)\n${wfs.length} scheduled workflows · ${findings.length} finding(s) · ${opened} issue(s)\n${findings.map((f) => `- ${f.kind} \`${f.wf}\`: ${f.detail}`).join('\n')}\n`;
  fs.mkdirSync(path.join(ROOT, 'data', 'status'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'status', 'workflow-watchdog.json'), `${JSON.stringify({ at: new Date().toISOString(), checked: wfs.length, findings }, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
}

module.exports = { cronPeriodHours, scheduledWorkflows, assess, repeatedFailures, LABEL };
if (require.main === module) main().catch((e) => { console.log(`::warning::watchdog: ${e.message}`); process.exit(0); });
