#!/usr/bin/env node
'use strict';

/**
 * Privacy Guard — Vérifie qu'aucun fichier sensible ou données opérationnelles
 * privées ne soit commité par erreur.
 *
 * Usage:
 *   node scripts/ci/privacy-guard.js [--fix]
 *
 * Avec --fix : untrack automatiquement les fichiers sensibles trackés
 * (les fichiers restent sur le disque).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const FIX = process.argv.includes('--fix');

const FORBIDDEN_PATTERNS = [
  // Credentials
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^secrets\.json$/i,
  /^credentials\.json$/i,
  /^token\.json$/i,
  /^config\.local\.js$/i,
  /^oauth2\.keys\.json$/i,
  /^client_secret.*\.json$/i,
  /^homey-auth\..*/i,
  /^\.netrc$/,
  /^\.npmrc$/,

  // Certificates / keystores
  /.*\.p12$/i,
  /.*\.pfx$/i,
  /.*\.keystore$/i,
  /.*\.pem$/i,
  /.*\.key$/i,

  // State files with operational/private data
  /^\.github\/state\/activity-cache\.json$/i,
  /^\.github\/state\/activity-snapshot\.json$/i,
  /^\.github\/state\/temporal-monitor-report\.json$/i,
  /^\.github\/state\/temporal-monitor-state\.json$/i,
  /^\.github\/state\/dashboard-monitor-report\.json$/i,
  /^\.github\/state\/gmail-token-health\.json$/i,
  /^\.github\/state\/homey-device-report\.json$/i,
  /^\.github\/state\/gmail-raw\//i,
  /^\.github\/state\/.*raw.*\.json$/i,
  /^\.github\/state\/.*gmail-dump.*\.json$/i,
  /^\.github\/state\/.*diagnostics-raw.*\.json$/i,

  // Operational caches
  /^data\/intel-harvest\//i,
  /^data\/community-sync\//i,
  /^data\/temp_desktop_cleanup\//i,
  /^data\/diagnostics\//i,
  /^data\/backups\//i,
  /^data\/archive\//i,
  /^data\/forum-cache\//i,

  // Diagnostic / shadow tooling dumps
  /^tools\/ci\/diagnostics\//i,
  /^tools\/ci\/\.cache\//i,
  /^tools\/shadow-mode\/tickets\//i,
  /^tools\/shadow-mode\/\.cache\//i,

  // Logs & generated reports
  /^reports\/logs\//i,
  /^icon_audit_report\.json$/i,

  // Screenshots / page dumps that may contain credentials
  /^screenshots\//i,
  /^screenshots-debug\//i,
  /^promote-screenshots\//i,
  /^push-promote-screenshots\//i,
  /^page-dump\.html$/i,
  /^gmail-dumps\//i,
  /^diagnostics\/raw\//i,

  // Backup / temp files
  /.*\.bak$/i,
  /.*\.bak\.\d+$/i,
  /.*\.tmp$/i,
  /.*\.old$/i,
  /.*\.orig$/i,
];

function getTrackedFiles() {
  try {
    const out = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch (e) {
    console.error('[privacy-guard] Failed to run git ls-files:', e.message);
    process.exit(1);
  }
}

function isForbidden(file) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  return FORBIDDEN_PATTERNS.some(p => p.test(rel));
}

function main() {
  const tracked = getTrackedFiles();
  const forbidden = tracked.filter(isForbidden);

  if (forbidden.length === 0) {
    console.log('[privacy-guard] ✅ No sensitive/operational files tracked.');
    process.exit(0);
  }

  console.error(`[privacy-guard] ❌ Found ${forbidden.length} sensitive/operational file(s) tracked by git:`);
  for (const f of forbidden) {
    console.error(`  - ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
  }

  if (FIX) {
    console.log('[privacy-guard] --fix requested: untracking files (they remain on disk)...');
    for (const f of forbidden) {
      try {
        execSync(`git rm --cached "${f}"`, { cwd: ROOT, stdio: 'ignore' });
        console.log(`[privacy-guard]   untracked ${path.relative(ROOT, f).replace(/\\/g, '/')}`);
      } catch (e) {
        console.error(`[privacy-guard]   failed to untrack ${f}:`, e.message);
      }
    }
    console.log('[privacy-guard] ✅ Done. Run git status to review changes.');
  } else {
    console.error('[privacy-guard] Run with --fix to untrack them automatically.');
    console.error('[privacy-guard] Or add them to .gitignore and run: git rm --cached <file>');
    process.exit(1);
  }
}

main();
