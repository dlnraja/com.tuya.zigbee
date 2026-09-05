#!/usr/bin/env node
'use strict';
/**
 * backport-candidates.js (P92.78)
 * Weekly report: lib/ files where master is AHEAD of stable-v5 for more
 * than 7 days — i.e. stability improvements soaking on master that are
 * ready to be backported. Informational only (no auto-PR, human decides).
 *
 * Output: .github/state/backport-candidates.json + console summary.
 * Usage: node tools/ci/backport-candidates.js [--json]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MASTER = path.join(__dirname, '..', '..');
const STABLE = path.join(MASTER, '..', 'stable');
const SOAK_DAYS = 7;

function sh(cmd, cwd) {
  try {return execSync(cmd, { cwd, encoding: 'utf8' }).trim();} catch {return '';}
}

function listJs(dir) {
  const out = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) {walk(fp);}
      else if (f.endsWith('.js')) {out.push(fp);}
    }
  };
  walk(dir);
  return out;
}

const report = { generated: new Date().toISOString(), soakDays: SOAK_DAYS, candidates: [], identical: 0, stableOnly: [] };

if (!fs.existsSync(STABLE)) {
  console.log('[backport-candidates] clone stable introuvable à ' + STABLE);
  process.exit(0);
}

for (const f of listJs(path.join(MASTER, 'lib'))) {
  const rel = path.relative(MASTER, f);
  const sf = path.join(STABLE, rel);
  if (!fs.existsSync(sf)) {
    report.stableOnly.push(rel);
    continue;
  }
  const a = fs.readFileSync(f, 'utf8');
  const b = fs.readFileSync(sf, 'utf8');
  if (a === b) {report.identical++; continue;}

  // Last commit date of this file on master
  const dateStr = sh(`git log -1 --format=%cI -- "${rel}"`, MASTER);
  if (!dateStr) {continue;}
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / 86400000;
  if (ageDays < SOAK_DAYS) {continue;}

  // Functional signal: does the master version mention fix/security/stability markers?
  const masterMsg = sh(`git log -3 --format=%s -- "${rel}"`, MASTER);
  const isStability = /fix|stab|crash|guard|sécurit|securit|leak|race|null/i.test(masterMsg);
  report.candidates.push({
    file: rel,
    lastMasterChange: dateStr,
    ageDays: Math.round(ageDays),
    stability: isStability
  });
}

report.candidates.sort((a, b) => (b.stability - a.stability) || (b.ageDays - a.ageDays));

fs.writeFileSync(
  path.join(MASTER, '.github', 'state', 'backport-candidates.json'),
  JSON.stringify(report, null, 1)
);

console.log(`[backport-candidates] ${report.identical} fichiers identiques | ${report.candidates.length} candidats (> ${SOAK_DAYS}j) | ${report.stableOnly.length} absents de stable`);
for (const c of report.candidates.slice(0, 15)) {
  console.log(`  ${c.stability ? '🛡️' : '  '} ${c.file} (${c.ageDays}j)`);
}
