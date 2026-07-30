#!/usr/bin/env node
'use strict';
/**
 * repo-housekeeping.js (v9.0.368)
 * ───────────────────────────────
 * Autonomous, safe repository tidying.
 *
 * Rules:
 *  - Only files matching an explicit RULE are candidates (no heuristic moves).
 *  - PROTECTED files are never touched, ever.
 *  - A candidate is moved ONLY if no other tracked file references its
 *    basename (code, workflows, scripts, docs). Referenced files are skipped
 *    and reported, never broken.
 *  - Tracked files are moved with `git mv` (history preserved); untracked
 *    files with plain rename.
 *  - DRY-RUN by default. Use --apply to execute.
 *  - Writes .github/state/housekeeping-report.json + prints a summary.
 *
 * Usage: node .github/scripts/repo-housekeeping.js [--apply]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');

// ─── Files that must NEVER move ─────────────────────────────────────────────
const PROTECTED = new Set([
  'app.js', 'api.js', 'app.json', 'package.json', 'package-lock.json',
  'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'jest.config.js', 'icon.svg',
  'LICENSE', 'README.md', 'README.txt', 'README.fr.txt', 'README.nl.txt',
  'README.de.txt', 'CHANGELOG.md', 'AGENTS.md', 'CORE_RULES.md',
  'AI_INSTRUCTIONS.md', 'AI_CONTEXT_MANDATE.md', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', 'CREDITS.md', 'PROJECT_INDEX.md', 'CODEOWNERS',
]);

// ─── Explicit move rules (root-level files only) ────────────────────────────
const RULES = [
  { match: /^AUDIT_.*\.md$/i, dest: 'reports' },
  { match: /^INVESTIGATION.*\.md$/i, dest: 'reports' },
  { match: /^(FINAL_AUDIT_REPORT|FIXES_SUMMARY|GLOBAL_IMPROVEMENT_PLAN|HISTORY_PURGE|IMAGE_ANALYSIS_REPORT|PR_DRAFT_HEGEL_FIXES|SUMMARY)\.md$/i, dest: 'reports' },
  { match: /_audit_(report|summary)\.(json|md)$/i, dest: 'reports' },
  { match: /^(FLOW_CARDS_AUDIT_REPORT|orphan_injection_(plan|report))\.json$/i, dest: 'reports' },
  { match: /^commit-msg-.*\.txt$/i, dest: 'reports' },
  { match: /^app\.json\.(backup\d*|bak)$/i, dest: 'backups' },
  { match: /^stable_app\.json$/i, dest: 'backups' },
  { match: /^(add-baseline|check-driver-mfrs|check-forum-fps|check-mfs-forum-fps|find-json-conflicts|fix-trailing-newline|fix-yaml-separators.*|patch_legacy|populate-mfs.*|propagate-modelids|sync-drivers-from-master|sync-p\d+.*)\.js$/i, dest: 'scripts/maintenance' },
  { match: /\.ps1$/i, dest: 'scripts/ps1' },
  { match: /^(driver-mapping-database|historical_mfs)\.json$/i, dest: 'data' },
];

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function isTracked(file) {
  try { sh(`git ls-files --error-unmatch "${file}"`); return true; } catch { return false; }
}

function countReferences(basename, selfPath) {
  // Count tracked files (other than itself) that mention the basename.
  try {
    const out = sh(`git grep -l -F "${basename}" -- . ":!${selfPath}" ":!.github/state" || true`);
    return out ? out.split('\n').filter(Boolean).length : 0;
  } catch { return 0; }
}

function main() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isFile())
    .map(e => e.name);

  const report = { timestamp: new Date().toISOString(), apply: APPLY, moved: [], skipped: [], noRule: 0 };

  for (const name of entries) {
    if (PROTECTED.has(name)) {continue;}
    const rule = RULES.find(r => r.match.test(name));
    if (!rule) {report.noRule++; continue;}

    const refs = countReferences(name, name);
    if (refs > 0) {
      report.skipped.push({ file: name, reason: `${refs} reference(s) entrante(s)` });
      continue;
    }

    const destDir = path.join(ROOT, rule.dest);
    const dest = path.join(destDir, name);
    if (fs.existsSync(dest)) {
      report.skipped.push({ file: name, reason: `destination existe déjà (${rule.dest}/)` });
      continue;
    }

    report.moved.push({ file: name, dest: `${rule.dest}/${name}`, tracked: isTracked(name) });
    if (APPLY) {
      fs.mkdirSync(destDir, { recursive: true });
      if (isTracked(name)) {
        sh(`git mv "${name}" "${rule.dest}/${name}"`);
      } else {
        fs.renameSync(path.join(ROOT, name), dest);
      }
    }
  }

  const stateDir = path.join(ROOT, '.github', 'state');
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, 'housekeeping-report.json'), JSON.stringify(report, null, 2));

  console.log(`[housekeeping] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} | à déplacer: ${report.moved.length} | ignorés (références/destination): ${report.skipped.length} | hors règles: ${report.noRule}`);
  for (const m of report.moved) {console.log(`  ${APPLY ? 'MOVED' : 'WOULD'} ${m.file} → ${m.dest}${m.tracked ? '' : ' (untracked)'}`);}
  for (const s of report.skipped) {console.log(`  SKIP  ${s.file} — ${s.reason}`);}
}

main();
