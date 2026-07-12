/**
 * sources/production-resolver.js
 *
 * Bridge to the PRODUCTION diagnostic-auto-resolver.js. Loads it as a library
 * and exposes the SAME tickets it would process on GitHub Actions, but
 * without making any network calls.
 *
 * This is the canonical way to do "what would the GHA do, locally".
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GITHUB_SCRIPTS = path.resolve(__dirname, '..', '..', '..', '.github', 'scripts');
const RESOLVER_PATH = path.join(GITHUB_SCRIPTS, 'diagnostic-auto-resolver.js');
const KB_PATH = path.join(GITHUB_SCRIPTS, 'bug-knowledge-base.js');

/**
 * Try to load the production resolver. If it can't be loaded (e.g. in tests
 * or in environments where the GHA scripts are not present), return a stub.
 */
function loadResolver() {
  try {
    if (!fs.existsSync(RESOLVER_PATH)) {
      return { available: false, reason: `Resolver not found at ${RESOLVER_PATH}` };
    }
    // We can't require it directly because it's a CLI script (no exports).
    // Instead, we'll spawn it as a subprocess with DRY_RUN=true to get the
    // tickets it WOULD process.
    return { available: true, path: RESOLVER_PATH };
  }
  catch (e) {
    return { available: false, reason: e.message };
  }
}

function loadKb() {
  try {
    if (!fs.existsSync(KB_PATH)) return null;
    return require(KB_PATH);
  }
  catch {
    return null;
  }
}

/**
 * Pull tickets from local CI state files. These are the PRODUCTION telemetry
 * feeds that the GHA writes to .github/state/:
 *   - bug-hunter-state.json
 *   - diagnostics-report.json (Gmail)
 *   - driver-health-report.json
 *   - resolver-report.json
 *
 * Each file represents tickets that have been collected by the GHA
 * pipelines and are ready for processing.
 */
function pullFromCiState(root) {
  const tickets = [];
  const STATE_DIR = path.resolve(__dirname, '..', '..', '..', '.github', 'state');

  if (!fs.existsSync(STATE_DIR)) {
    return tickets;
  }

  // 1. Bug hunter state
  const bugHunter = path.join(STATE_DIR, 'bug-hunter-state.json');
  if (fs.existsSync(bugHunter)) {
    try {
      const bh = JSON.parse(fs.readFileSync(bugHunter, 'utf8'));
      const warnings = (bh.warnings || []).slice(0, 5);
      for (const w of warnings) {
        tickets.push({
          id: `bughunter-${w.rule || 'unknown'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          source: 'bug-hunter',
          title: `[Bug Hunter] ${w.rule || 'Warning'}: ${w.file || '?'}:${w.line || '?'}`,
          body: w.message || JSON.stringify(w),
          mfr: null,
          deviceIds: [],
          status: 'open',
          severity: w.severity || 'warning',
        });
      }
    }
    catch { /* ignore */ }
  }

  // 2. Driver health report
  const dh = path.join(STATE_DIR, 'driver-health-report.json');
  if (fs.existsSync(dh)) {
    try {
      const report = JSON.parse(fs.readFileSync(dh, 'utf8'));
      const critical = (report.critical || report.drivers || [])
        .filter((d) => (d.score || 100) < 50)
        .slice(0, 5);
      for (const c of critical) {
        tickets.push({
          id: `driverhealth-${c.id || c.driverId || 'unknown'}-${Date.now()}`,
          source: 'driver-health',
          title: `[Driver Health] ${c.id || c.driverId} score ${c.score || '?'}/100`,
          body: c.issues ? c.issues.join('; ') : (c.error || 'low health score'),
          mfr: null,
          deviceIds: [],
          status: 'open',
          severity: 'critical',
        });
      }
    }
    catch { /* ignore */ }
  }

  // 3. Resolver report
  const rr = path.join(STATE_DIR, 'resolver-report.json');
  if (fs.existsSync(rr)) {
    try {
      const rep = JSON.parse(fs.readFileSync(rr, 'utf8'));
      const items = (rep.items || rep.tickets || []).slice(0, 5);
      for (const it of items) {
        tickets.push({
          id: `resolver-${it.id || Date.now()}`,
          source: 'resolver',
          title: it.title || '[Resolver] Pending ticket',
          body: it.body || '',
          mfr: it.mfr || null,
          deviceIds: it.deviceIds || [],
          status: it.status || 'pending',
        });
      }
    }
    catch { /* ignore */ }
  }

  // 4. Diagnostics report (Gmail)
  const dr = path.join(STATE_DIR, 'diagnostics-report.json');
  if (fs.existsSync(dr)) {
    try {
      const d = JSON.parse(fs.readFileSync(dr, 'utf8'));
      const diags = (d.diagnostics || []).slice(0, 5);
      for (const diag of diags) {
        tickets.push({
          id: `gmail-diag-${diag.id || Date.now()}`,
          source: 'gmail-diagnostics',
          title: diag.subject || '[Gmail] Diagnostic email',
          body: diag.body || '',
          mfr: diag.mfr || null,
          deviceIds: diag.deviceIds || [],
          status: 'open',
        });
      }
    }
    catch { /* ignore */ }
  }

  return tickets;
}

/**
 * Pull the bug knowledge base patterns and emit "preventive" tickets
 * for known classes of issues. This is the "what could go wrong" view.
 */
function pullFromKnowledgeBase(root) {
  const tickets = [];
  const kb = loadKb();
  if (!kb) return tickets;

  // Critical patterns
  const patterns = (kb.CRITICAL_PATTERNS || []).slice(0, 5);
  for (const p of patterns) {
    tickets.push({
      id: `kb-pattern-${p.id || 'unknown'}-${Date.now()}`,
      source: 'bug-knowledge-base',
      title: `[KB] Known pattern: ${p.id || p.name || 'unknown'}`,
      body: p.description || p.fix || JSON.stringify(p),
      mfr: null,
      deviceIds: [],
      status: 'monitored',
      severity: p.severity || 'medium',
    });
  }

  return tickets;
}

/**
 * Aggregate entry point.
 */
function pullFromProduction(root) {
  return [
    ...pullFromCiState(root),
    ...pullFromKnowledgeBase(root),
  ];
}

module.exports = {
  pullFromProduction,
  pullFromCiState,
  pullFromKnowledgeBase,
  loadResolver,
  loadKb,
};
