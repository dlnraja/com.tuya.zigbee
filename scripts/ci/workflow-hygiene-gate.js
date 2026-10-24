#!/usr/bin/env node
'use strict';
/**
 * P3025 (25/10/2026 Paris): CI/CD hygiene ratchet for .github/workflows + .github/actions.
 * Fails only on REGRESSIONS against .github/workflow-hygiene-baseline.json (existing debt is listed,
 * never silently grows). Rules:
 *   unpinned      — external `uses:` not pinned to a 40-hex commit SHA
 *   node20-action — action SHA known to run on the deprecated Node 20 runtime
 *   node-runtime  — setup-node `node-version` < 22 (homey CLI needs 22)
 *   no-timeout    — job without `timeout-minutes` (a hung job burns 6 h of runner)
 *   raw-push      — `git push` to a branch outside the shared race-safe helper
 *                   (.github/scripts/git-push-retry.sh / scripts/ci/push-with-retry.js), counted per file
 * Usage: node scripts/ci/workflow-hygiene-gate.js [--root=DIR] [--update-baseline] [--json]
 */
const fs = require('fs');
const path = require('path');

const NODE20_SHAS = new Set([
  '11d5960a326750d5838078e36cf38b85af677262', '49933ea5288caeca8642d1e84afbd3f7d6820020', 'ea165f8d65b6e75b540449e92b4886f43607fa02',
  '0057852bfaa89a56745cba8c7296529d2fc39830', 'f28e40c7f34bde8b3046d885e986cb6290c5673b', '8558fd74291d67161a8a78ce36a881fa63b766a9',
  '5bef64f19d7facfb25b37b414482c7164d639639', 'a26af69be951a213d495a4c3e4e4022e16d87065', 'd6db90164ac5ed86f2b6aed7e0febac5b3c0c03e',
  '56afc609e74202658d3ffba0e8f6dda462b719fa', '21025c705c08248db411dc16f3619e6b5f9ea21a', '3bb12739c298aeb8a4eeaf626c5b8d85266b0e65',
  'c5a7806660adbe173f04e3e038b0ccdcd758773c',
]);

function listFiles(root) {
  const out = [];
  const wf = path.join(root, '.github', 'workflows');
  if (fs.existsSync(wf)) for (const f of fs.readdirSync(wf)) if (/\.ya?ml$/.test(f)) out.push(path.join(wf, f));
  const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/^action\.ya?ml$/.test(e.name)) out.push(p); } };
  walk(path.join(root, '.github', 'actions'));
  return out.sort();
}

function jobsWithoutTimeout(text) {
  // Line-based: top-level `jobs:` block, job keys at 2-space indent; reusable-workflow jobs (uses:) are exempt.
  const lines = text.split('\n'); const res = [];
  const j = lines.findIndex((l) => /^jobs:\s*$/.test(l)); if (j < 0) return res;
  let cur = null; let has = false; let reusable = false;
  const flush = () => { if (cur && !has && !reusable) res.push(cur); };
  for (let i = j + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\S/.test(l) && !/^#/.test(l)) break;
    const m = l.match(/^ {2}([A-Za-z0-9_-]+):\s*(#.*)?$/);
    if (m) { flush(); cur = m[1]; has = false; reusable = false; continue; }
    if (/^ {4}timeout-minutes:/.test(l)) has = true;
    if (/^ {4}uses:/.test(l)) reusable = true;
  }
  flush();
  return res;
}

function scan(root) {
  const findings = [];
  for (const abs of listFiles(root)) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    const text = fs.readFileSync(abs, 'utf8');
    const lines = text.split('\n');
    let rawPush = 0;
    lines.forEach((l, i) => {
      if (/^\s*#/.test(l) || /^\s*-?\s*name:/.test(l)) return;
      const u = l.match(/^\s*-?\s*uses:\s*['"]?([^\s'"#]+)/);
      if (u && !u[1].startsWith('./') && !u[1].startsWith('docker://')) {
        const [, ref = ''] = u[1].split('@');
        if (!/^[0-9a-f]{40}$/.test(ref)) findings.push({ rule: 'unpinned', file: rel, key: u[1] });
        else if (NODE20_SHAS.has(ref)) findings.push({ rule: 'node20-action', file: rel, key: u[1] });
      }
      const nv = l.match(/^\s*node-version:\s*['"]?(\d+)/);
      if (nv && Number(nv[1]) < 22) findings.push({ rule: 'node-runtime', file: rel, key: `node-version ${nv[1]} (line ${i + 1})` });
      if (/\bgit\s+push\b/.test(l) && !/git-push-retry|push-with-retry/.test(l) && !/--dry-run/.test(l)) rawPush++;
    });
    if (rawPush) findings.push({ rule: 'raw-push', file: rel, key: 'count', count: rawPush });
    if (rel.startsWith('.github/workflows/')) for (const job of jobsWithoutTimeout(text)) findings.push({ rule: 'no-timeout', file: rel, key: job });
  }
  return findings;
}

const id = (f) => `${f.rule}|${f.file}|${f.key.replace(/ \(line \d+\)$/, '')}`;

function compare(findings, baseline) {
  const base = new Map((baseline.findings || []).map((f) => [id(f), f]));
  const regressions = [];
  for (const f of findings) {
    const b = base.get(id(f));
    if (!b) regressions.push(f);
    else if (f.rule === 'raw-push' && f.count > (b.count || 0)) regressions.push({ ...f, was: b.count });
  }
  const fixed = [...base.keys()].filter((k) => !findings.some((f) => id(f) === k));
  return { regressions, fixed };
}

function main(argv = process.argv.slice(2)) {
  const root = path.resolve((argv.find((a) => a.startsWith('--root=')) || '').slice(7) || path.resolve(__dirname, '..', '..'));
  const bpath = path.join(root, '.github', 'workflow-hygiene-baseline.json');
  const findings = scan(root);
  if (argv.includes('--update-baseline')) {
    fs.writeFileSync(bpath, JSON.stringify({ note: 'P3025 hygiene ratchet: shrink only. Regenerate with --update-baseline after FIXING debt, never to admit new debt.', findings }, null, 2) + '\n');
    console.log(`[workflow-hygiene] baseline written: ${findings.length} finding(s)`); return 0;
  }
  const baseline = fs.existsSync(bpath) ? JSON.parse(fs.readFileSync(bpath, 'utf8')) : { findings: [] };
  const { regressions, fixed } = compare(findings, baseline);
  if (argv.includes('--json')) console.log(JSON.stringify({ findings: findings.length, regressions, fixed }, null, 2));
  const by = {}; for (const f of findings) by[f.rule] = (by[f.rule] || 0) + (f.count || 1);
  console.log(`[workflow-hygiene] ${findings.length} known finding(s) ${JSON.stringify(by)}; fixed vs baseline: ${fixed.length}`);
  if (regressions.length) {
    for (const r of regressions) console.log(`::error file=${r.file}::P3025 hygiene regression [${r.rule}] ${r.key}${r.count ? ` count ${r.count} (baseline ${r.was || 0}) — use .github/scripts/git-push-retry.sh` : ''}`);
    console.log(`[workflow-hygiene] FAIL ${regressions.length} regression(s)`); return 1;
  }
  console.log('[workflow-hygiene] OK no regression'); return 0;
}

module.exports = { scan, compare, jobsWithoutTimeout, NODE20_SHAS };
if (require.main === module) process.exitCode = main();
