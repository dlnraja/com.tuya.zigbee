#!/usr/bin/env node
/**
 * audit-johan-references.js
 *
 * CRITICAL: audits all workflows, scripts, and configs for any reference
 * to the UPSTREAM repo (JohanBendz/com.tuya.zigbee).
 *
 * Target: NEVER write to Johan's repo. All writes go to dlnraja/com.tuya.zigbee.
 *
 * @author Mavis P10 — security audit
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UPSTREAM = 'JohanBendz/com.tuya.zigbee';
const FORK = 'dlnraja/com.tuya.zigbee';

const SEARCH_DIRS = [
  '.github/workflows',
  '.github/scripts',
  'tools',
  '.diag',
  'data',
];

const ALLOW_LIST = [
  // Files that LEGITIMATELY reference upstream (read-only / references)
  '.diag/johan-shadow-comments-audit.json',  // read-only audit
  '.diag/johan-shadow-audit.js',             // read-only audit
  'data/community-sync/johanbendz-issues-enriched.json',  // data
  'tools/ci/audit-johan-references.js',      // this file (regex patterns)
  'tools/ci/check-writes.js',                // audit script (regex patterns)
  'tools/ci/final-p10-state.js',             // references this audit
  'tools/ci/delete-johan-comments.js',       // EXPLICIT EXCEPTION (triple confirm)
  'tools/ci/collect-johan-comments-to-delete.js', // generates the exception list
  '.github/workflows/publish.yml',           // contains guard pattern
  '.github/workflows/publish-stable.yml',    // contains guard pattern
  '.github/workflows/continuous-flow.yml',   // references guard
  '.github/workflows/code-quality.yml',      // contains guard pattern
  '.github/workflows/e2e-dashboard-test.yml',// references guard
  '.github/workflows/upstream-guard.yml',    // guard itself
  'docs/JOHAN_DASHBOARD_DIAG_2026-07-12.md',
  'docs/AI_BEHAVIOR_SYNTHESIS_2026-07-12.md',
  'docs/MFR_INTEGRATION_REPORT_2026-07-12.md',
  'docs/P8_CONTINUOUS_AUTONOMOUS_2026-07-12.md',
  'docs/P9_WORKFLOW_CONSOLIDATION_2026-07-12.md',
  'docs/P10_SECURITY_AUTOMATION_2026-07-12.md',
  'PR_DRAFT_HEGEL_FIXES.md',
  'docs/INVESTIGATION_2026-07-10.md',
];

const FORBIDDEN_PATTERNS = [
  // === Strict writes to upstream — only FLAG actual write operations ===
  // git clone, GET, fetch are READ-ONLY and OK
  // DELETE is FORBIDDEN by default; only allowed via EXPLICIT exception
  //   (see tools/ci/delete-johan-comments.js with ALLOW_UPSTREAM_WRITE=true)
  /gh\s+pr\s+create.*--repo\s+JohanBendz/i,
  /gh\s+issue\s+create.*--repo\s+JohanBendz/i,
  /gh\s+api\s+.*-X\s+POST.*JohanBendz/i,
  /gh\s+api\s+.*-X\s+PUT.*JohanBendz/i,
  /gh\s+api\s+.*-X\s+PATCH.*JohanBendz/i,
  /gh\s+api\s+.*-X\s+DELETE.*JohanBendz/i,
  /curl\s+.*-X\s+POST.*JohanBendz/i,
  /curl\s+.*-X\s+PUT.*JohanBendz/i,
  /curl\s+.*-X\s+PATCH.*JohanBendz/i,
  /curl\s+.*-X\s+DELETE.*JohanBendz/i,
  /fetch\s*\(.*method:\s*['"]POST['"].*JohanBendz/i,
  /fetch\s*\(.*method:\s*['"]PUT['"].*JohanBendz/i,
  /fetch\s*\(.*method:\s*['"]PATCH['"].*JohanBendz/i,
  /fetch\s*\(.*method:\s*['"]DELETE['"].*JohanBendz/i,
  /method:\s*['"]DELETE['"]/i,  // generic DELETE method
  /method:\s*['"]POST['"]/i,    // generic POST method
  /method:\s*['"]PUT['"]/i,
  /method:\s*['"]PATCH['"]/i,
  /git\s+push.*JohanBendz/i,
  /git\s+push.*origin.*JohanBendz/i,
  /git\s+push.*upstream.*JohanBendz/i,
  /git@github\.com:JohanBendz/i,
];

const ALLOWED_OPS = [
  // Read-only operations are OK
  /git\s+clone.*JohanBendz/i,
  /git\s+fetch.*JohanBendz/i,
  /gh\s+api\s+.*-X\s+GET.*JohanBendz/i,
  /gh\s+pr\s+list.*JohanBendz/i,
  /gh\s+issue\s+list.*JohanBendz/i,
  /gh\s+api\s+repos\/JohanBendz/i,  // GET by default
];

function main() {
  console.log('Johan Reference Audit v1.0.0\n');
  console.log('Target:', UPSTREAM, '(NEVER write here)');
  console.log('Fork  :', FORK, '(all writes go here)');
  console.log();

  const issues = [];
  const warnings = [];
  const infoOnly = [];

  for (const dir of SEARCH_DIRS) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    walk(dirPath, dir, issues, warnings, infoOnly);
  }

  console.log('=== ISSUES (forbidden patterns) ===');
  if (issues.length === 0) console.log('  NONE');
  for (const i of issues) {
    console.log('  ❌ ' + i.file + ':' + i.line);
    console.log('     ' + i.content.substring(0, 120));
  }
  // Categorize issues
  const byPattern = {};
  for (const i of issues) {
    const p = (i.pattern || 'unknown').substring(0, 60);
    byPattern[p] = (byPattern[p] || 0) + 1;
  }
  console.log('\nBy pattern:');
  for (const [p, c] of Object.entries(byPattern).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + p + ': ' + c);
  }

  console.log('\n=== WARNINGS (uses upstream ref but might be ok) ===');
  if (warnings.length === 0) console.log('  NONE');
  for (const w of warnings.slice(0, 20)) {
    console.log('  ⚠️  ' + w.file + ':' + w.line);
    console.log('     ' + w.content.substring(0, 120));
  }
  if (warnings.length > 20) console.log('  ... and ' + (warnings.length - 20) + ' more');

  console.log('\n=== INFO (legitimate references) ===');
  console.log('  ' + infoOnly.length + ' legitimate references (read-only / docs)');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    target: UPSTREAM,
    fork: FORK,
    summary: {
      issues: issues.length,
      warnings: warnings.length,
      info: infoOnly.length,
    },
    issues,
    warnings,
  };
  const out = path.join(ROOT, '.github', 'state', 'johan-references-audit.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('\n✓ Report:', out);
  console.log('Issues:', issues.length, '| Warnings:', warnings.length);
  if (issues.length > 0) {
    console.log('\n🚨 FIX REQUIRED: ' + issues.length + ' forbidden references to upstream');
    process.exit(1);
  }
}

function walk(dir, rel, issues, warnings, infoOnly) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const relPath = path.relative(ROOT, p).replace(/\\/g, '/');
    if (e.isDirectory()) {
      // Skip .disabled and node_modules
      if (e.name === 'node_modules' || e.name === '.disabled' || e.name === '.git') continue;
      walk(p, rel + '/' + e.name, issues, warnings, infoOnly);
    } else if (e.isFile() && (e.name.endsWith('.yml') || e.name.endsWith('.yaml') ||
        e.name.endsWith('.js') || e.name.endsWith('.json') ||
        e.name.endsWith('.sh') || e.name.endsWith('.ps1') ||
        e.name.endsWith('.md') || e.name.endsWith('.txt'))) {
      const content = fs.readFileSync(p, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('JohanBendz') || line.includes('JohanBendz/com.tuya.zigbee')) {
          // Allow-listed files (regex patterns, guard patterns, docs) → info only
          if (ALLOW_LIST.some(allow => relPath.endsWith(allow))) {
            infoOnly.push({ file: relPath, line: i + 1, content: line.trim() });
            continue;
          }
          // Skip if it's an allowed read-only op
          if (ALLOWED_OPS.some(pat => pat.test(line))) {
            continue;
          }
          // Check forbidden patterns
          let isIssue = false;
          for (const pat of FORBIDDEN_PATTERNS) {
            if (pat.test(line)) {
              issues.push({ file: relPath, line: i + 1, content: line.trim(), pattern: pat.source });
              isIssue = true;
              break;
            }
          }
          if (!isIssue) {
            warnings.push({ file: relPath, line: i + 1, content: line.trim() });
          }
        }
      }
    }
  }
}

if (require.main === module) main();
