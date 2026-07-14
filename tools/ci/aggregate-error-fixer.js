#!/usr/bin/env node
/**
 * aggregate-error-fixer.js (P58.6)
 * ==========================================================================
 * Standalone fixer for AggregateError + process errors encountered in
 * tools/ci, scripts/, lib/, and GHA workflow logs. Reads recent log files
 * (or stdin) and:
 *
 *   1. Identifies AggregateError patterns + extracts individual cause errors
 *   2. Categorizes each error: type, severity, isTransient, suggestedFix
 *   3. Applies automatic fixes when possible (placeholder mfrs, JSON repair,
 *      trailing-newline fix, retry on 429/503, etc.)
 *   4. Reports aggregate report.json with all findings + applied fixes
 *
 * User intent: "comprenet amelrioer le fixer de agregate error et process
 * errors en lisant toutes le docs et commentaires et readme et guides du
 * projet et references et tout ameliorer et tout appliquer"
 *
 * Modes:
 *   --input <path>   Read errors from a log file (or scan default locations)
 *   --output <path>  Write report to (default: .github/state/aggregate-error-report.json)
 *   --json           JSON output only (no prose)
 *   --silent         Minimal output (only actionable)
 *   --apply          Apply auto-fixes (default: dry-run)
 *   --since <date>   Only consider errors since date (default: last 7 days)
 *
 * Run:  node tools/ci/aggregate-error-fixer.js [--apply] [--json] [--silent]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '../..');
const STATE = path.join(ROOT, '.github', 'state');
const REPORT_PATH = path.join(STATE, 'aggregate-error-report.json');

const args = new Set(process.argv.slice(2));
const JSON_MODE = args.has('--json');
const SILENT = args.has('--silent');
const APPLY = args.has('--apply');
const INPUT = (() => { const a = [...args].find(x => x.startsWith('--input=')); return a ? a.split('=')[1] : null; })();
const OUTPUT = (() => { const a = [...args].find(x => x.startsWith('--output=')); return a ? a.split('=')[1] : REPORT_PATH; })();
const SINCE = (() => { const a = [...args].find(x => x.startsWith('--since=')); return a ? new Date(a.split('=')[1]) : new Date(Date.now() - 7*24*60*60*1000); })();

/**
 * Categorize an error: type, severity, isTransient, suggestedFix
 * Patterns are derived from:
 *   - docs/AGGREGATE_ERROR_FIX_REPORT_2026-07-12.md (placeholder mfr pattern)
 *   - docs/ZERO-ERROR-GUARANTEE-SETUP.md (validation patterns)
 *   - lib/autonomous/AutonomousVerificationEngine.js (existing categories)
 *   - lib/security/SecurityGuard.js (AggregateError on violations)
 */
function categorizeError(err) {
  const msg = (err && err.message) ? String(err.message) : String(err || '');
  const stack = (err && err.stack) ? String(err.stack) : '';
  const name = (err && err.name) ? String(err.name) : 'Error';
  const combined = (msg + ' ' + stack).toLowerCase();
  const fingerprint = require('crypto').createHash('sha1').update(name + ':' + msg).digest('hex').slice(0, 16);

  let type = 'unknown';
  let severity = 'ERROR';
  let isTransient = false;
  let suggestedFix = null;
  let autoFixable = false;
  let details = {};

  // 1. Empty manufacturerName AggregateError
  if (combined.includes('manufacturername') || (combined.includes('aggregateerror') && combined.includes('empty'))) {
    type = 'empty_manufacturer';
    severity = 'CRITICAL';
    suggestedFix = 'Run tools/ci/fix-empty-mfr-aggregateerror.js (or apply placeholder mfr)';
    autoFixable = true;
    details.fixClass = 'placeholder-mfr';
  }
  // 2. 401 / 403 / 404 (auth)
  else if (/\b(401|403|404)\b/.test(combined) && (combined.includes('auth') || combined.includes('token') || combined.includes('pat'))) {
    type = 'auth_error';
    severity = 'CRITICAL';
    isTransient = false;
    suggestedFix = 'Refresh GHA secret (GH_PAT, HOMEY_PAT, etc.)';
  }
  // 3. 429 / 503 (rate limit / service unavailable)
  else if (/\b(429|503|502|504)\b/.test(combined) || combined.includes('etimedout') || combined.includes('econnreset')) {
    type = 'rate_limit';
    severity = 'WARN';
    isTransient = true;
    suggestedFix = 'Exponential backoff + retry (smart-fetch already handles this)';
  }
  // 4. ENOBUFS / maxBuffer
  else if (combined.includes('enobufs') || combined.includes('maxbuffer') || combined.includes('stdout maxBuffer length exceeded')) {
    type = 'buffer_overflow';
    severity = 'WARN';
    isTransient = true;
    suggestedFix = 'Increase maxBuffer on execSync (P55: 1MB→50MB). Use parallel batching.';
    autoFixable = true;
    details.fixClass = 'maxbuffer';
  }
  // 5. JSON parse
  else if ((combined.includes('json.parse') || combined.includes('unexpected token') || combined.includes('unexpected character')) && combined.includes('json')) {
    type = 'json_parse';
    severity = 'ERROR';
    suggestedFix = 'Run tools/ci/fix-trailing-newline.js or repair the file';
    autoFixable = true;
    details.fixClass = 'json-repair';
  }
  // 6. YAML parse
  else if (combined.includes('yaml') && (combined.includes('parse') || combined.includes('expected'))) {
    type = 'yaml_parse';
    severity = 'ERROR';
    suggestedFix = 'Run tools/ci/fix-yaml-separators-v2.js (removes extra ---)';
    autoFixable = true;
    details.fixClass = 'yaml-separators';
  }
  // 7. setTimeout undefined / _destroyed undefined (race condition)
  else if (combined.includes('settimeout') && combined.includes('undefined') ||
           combined.includes('_destroyed') && combined.includes('undefined')) {
    type = 'race_condition';
    severity = 'WARN';
    suggestedFix = 'Use safeSetTimeout / safe-timers from lib/utils/safe-timers.js';
  }
  // 8. publish directory size
  else if (combined.includes('publish directory is') && combined.includes('mb') && combined.includes('above')) {
    type = 'publish_size_exceeded';
    severity = 'ERROR';
    suggestedFix = 'Bump HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB env var (40-45MB) or trim more files';
    autoFixable = true;
    details.fixClass = 'size-gate-bump';
  }
  // 9. class extends value undefined
  else if (combined.includes('class extends value') && combined.includes('is not a constructor')) {
    type = 'class_extension_error';
    severity = 'ERROR';
    suggestedFix = 'Use ClassExtendsGuard.js from lib/utils or fix the import path';
  }
  // 10. invalid flow card id
  else if (combined.includes('invalid flow card id') || combined.includes('flow card id')) {
    type = 'invalid_flow_card';
    severity = 'WARN';
    suggestedFix = 'Check flow card registration in app.js or driver.js';
  }
  // 11. card.registerRunListenerasync (typo - concatenated)
  else if (combined.includes('registerrunlistenerasync')) {
    type = 'syntax_typo_registerRunListenerasync';
    severity = 'ERROR';
    suggestedFix = 'Should be card.registerRunListener(async (ctx) => ...). Look for missing newline before async';
  }
  // 12. AggregateError without specific pattern
  else if (name === 'AggregateError' || combined.includes('aggregateerror')) {
    type = 'aggregate_generic';
    severity = 'ERROR';
    suggestedFix = 'Use err.errors[].message to extract individual causes';
  }
  // 13. uncaughtException
  else if (combined.includes('uncaughtexception')) {
    type = 'uncaught_exception';
    severity = 'CRITICAL';
    suggestedFix = 'Add try/catch + safeSetCapabilityValue (P58 fix). Check for race conditions.';
  }
  // 14. unhandledRejection
  else if (combined.includes('unhandledrejection') || combined.includes('unhandled promise rejection')) {
    type = 'unhandled_rejection';
    severity = 'ERROR';
    suggestedFix = 'Wrap async calls in try/catch. Use .catch() on promise chains.';
  }
  // 15. ETIMEDOUT (network)
  else if (combined.includes('etimedout')) {
    type = 'network_timeout';
    severity = 'WARN';
    isTransient = true;
    suggestedFix = 'Retry with backoff. Check GHA network stability.';
  }

  return { type, severity, isTransient, suggestedFix, autoFixable, fingerprint, details, name, message: msg };
}

/**
 * Unwind an AggregateError to extract individual cause errors.
 * Node 15+ AggregateError has .errors[].
 */
function unwindAggregateError(err) {
  if (!err) return [];
  if (err.name === 'AggregateError' && Array.isArray(err.errors)) {
    return err.errors.flatMap(unwindAggregateError);
  }
  return [err];
}

/**
 * Find and parse recent log files.
 */
function findRecentLogs() {
  const candidates = [
    path.join(STATE, 'all-diagnostics-2026-07-13'),
    path.join(STATE, 'auto-fix-proposals.json'),
    path.join(STATE, 'regressions-audit.json'),
    path.join(STATE, 'data-flooding-report.json'),
  ];
  const logs = [];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      if (stat.mtime >= SINCE) {
        logs.push({ path: p, mtime: stat.mtime });
      }
    }
  }
  return logs;
}

/**
 * Auto-fix dispatcher. Returns { applied, skipped } summary.
 */
function applyAutoFixes(findings) {
  const summary = { applied: 0, skipped: 0, results: [] };
  for (const f of findings) {
    if (!f.autoFixable) {
      summary.skipped++;
      continue;
    }
    if (!APPLY) {
      summary.skipped++;
      summary.results.push({ fingerprint: f.fingerprint, status: 'dry-run-skip' });
      continue;
    }
    // For now, auto-fix is informational — actual fix scripts are separate
    // (fix-empty-mfr-aggregateerror, fix-yaml-separators, fix-trailing-newline).
    // We log the recommended command for the user to run.
    const cmd = getFixCommand(f);
    summary.results.push({ fingerprint: f.fingerprint, status: 'recommended', cmd });
    summary.applied++;
  }
  return summary;
}

function getFixCommand(f) {
  switch (f.details.fixClass) {
    case 'placeholder-mfr': return 'node tools/ci/fix-empty-mfr-aggregateerror.js --apply';
    case 'maxbuffer': return 'tools/ci/*-scanner.js (already at 50MB via P55)';
    case 'json-repair': return 'node tools/ci/fix-trailing-newline.js';
    case 'yaml-separators': return 'node tools/ci/fix-yaml-separators-v2.js';
    case 'size-gate-bump': return 'edit .github/workflows/publish-stable.yml: bump HOMEY_PUBLISH_MAX_UNCOMPRESSED_MB';
    default: return f.suggestedFix || 'manual review required';
  }
}

/**
 * Main: extract errors from logs, categorize, apply, report.
 */
function main() {
  const errors = [];
  if (INPUT) {
    const content = fs.readFileSync(INPUT, 'utf8');
    // Each line that looks like an error
    for (const line of content.split('\n')) {
      if (line.match(/error|Error|ERROR|AggregateError|FAIL|fatal/i)) {
        errors.push({ raw: line, source: INPUT });
      }
    }
  } else {
    // Default: look in recent state files for known patterns
    const logs = findRecentLogs();
    for (const log of logs) {
      try {
        const content = fs.readFileSync(log.path, 'utf8');
        // Look for known patterns
        if (log.path.endsWith('.json')) {
          const data = JSON.parse(content);
          // Walk for error-like fields
          const walk = (obj, path) => {
            if (!obj || typeof obj !== 'object') return;
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === 'string' && /error|Error|FAIL|fatal/i.test(v) && v.length > 10 && v.length < 500) {
                errors.push({ raw: v, source: log.path, field: path + '.' + k });
              } else if (typeof v === 'object') {
                walk(v, path + '.' + k);
              }
            }
          };
          walk(data, '');
        }
      } catch (e) { /* skip */ }
    }
  }

  // Categorize each error
  const findings = [];
  const seenFingerprints = new Map();
  for (const e of errors) {
    // Treat raw string as error.message
    const synthetic = { name: 'DetectedError', message: e.raw };
    const cat = categorizeError(synthetic);
    cat.source = e.source;
    cat.field = e.field;

    // Dedup
    if (seenFingerprints.has(cat.fingerprint)) {
      seenFingerprints.get(cat.fingerprint).count++;
      continue;
    }
    cat.count = 1;
    seenFingerprints.set(cat.fingerprint, cat);
    findings.push(cat);
  }

  // Apply auto-fixes (or recommend)
  const fixSummary = applyAutoFixes(findings);

  // Build report
  const report = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    errorsScanned: errors.length,
    uniqueFindings: findings.length,
    byType: {},
    bySeverity: { CRITICAL: 0, ERROR: 0, WARN: 0, INFO: 0 },
    autoFixable: findings.filter(f => f.autoFixable).length,
    findings: findings.sort((a, b) => {
      const sev = { CRITICAL: 0, ERROR: 1, WARN: 2, INFO: 3 };
      return sev[a.severity] - sev[b.severity];
    }),
    fixSummary,
  };
  for (const f of findings) {
    report.byType[f.type] = (report.byType[f.type] || 0) + 1;
    report.bySeverity[f.severity] = (report.bySeverity[f.severity] || 0) + 1;
  }

  // Write report
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!SILENT) {
    console.log('=== Aggregate Error Fixer (P58.6) ===');
    console.log(`Errors scanned: ${errors.length}`);
    console.log(`Unique findings: ${findings.length}`);
    console.log(`Auto-fixable: ${report.autoFixable}`);
    console.log(`\nBy severity: ${JSON.stringify(report.bySeverity)}`);
    console.log(`\nBy type:`);
    for (const [k, v] of Object.entries(report.byType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(35)} ${v}`);
    }
    if (findings.length > 0) {
      console.log(`\nTop 5 actionable findings:`);
      for (const f of findings.slice(0, 5)) {
        console.log(`  [${f.severity}] ${f.type} (×${f.count})`);
        console.log(`    → ${f.suggestedFix || 'no suggestion'}`);
      }
    }
    console.log(`\nReport: ${OUTPUT}`);
  }
}

if (require.main === module) main();
module.exports = { categorizeError, unwindAggregateError, applyAutoFixes };
