#!/usr/bin/env node
'use strict';

/**
 * gmail-crash-pattern-gate.js (P100)
 *
 * Cross-ref Gmail crash/diag emails + carto/dashboard reports into a single
 * actionable signature report. Detects known fatal patterns that must stay fixed:
 *   - getDeviceActionCard is not a function
 *   - Cannot assign to read only property 'error'
 *   - reading '_destroyed' (unbound this)
 *   - getDiscoveries is not a function
 *   - reading 'catch' (non-promise .catch)
 *
 * Inputs (first existing wins per source):
 *   .github/state/diagnostics-report.json
 *   diagnostics/summary.json
 *   .github/state/dashboard-monitor-report.json
 *   .github/state/homey-device-report.json
 *   tmp/gmail-art/** (local artifact download)
 *
 * Usage:
 *   node tools/ci/gmail-crash-pattern-gate.js
 *   node tools/ci/gmail-crash-pattern-gate.js --strict   # exit 1 if NEW unknown fatal
 *   node tools/ci/gmail-crash-pattern-gate.js --json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, '.github', 'state', 'gmail-crash-patterns.json');
const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_MODE = args.includes('--json');

const KNOWN_PATTERNS = [
  {
    id: 'flow_getDeviceActionCard',
    severity: 'fatal',
    re: /getDeviceActionCard\s+is not a function|flow\.getDeviceActionCard/i,
    fix: 'app.js FLOW-GUARD polyfill + getActionCard fallbacks in drivers',
    status: 'fixed_p100',
  },
  {
    id: 'readonly_error_assign',
    severity: 'fatal',
    re: /Cannot assign to read only property ['"]error['"]|assign to read only property ['"]error['"]/i,
    fix: 'Never assign this.error; DiagnosticLogsCollector skip locked props; use _boundError',
    status: 'fixed_p100',
  },
  {
    id: 'unbound_destroyed',
    severity: 'fatal',
    re: /reading ['_"]_destroyed['_"]|Cannot read properties of undefined \(reading '_destroyed'\)/i,
    fix: 'Use _boundError/_boundLog; never pass unbound this.error to .catch',
    status: 'fixed_p100',
  },
  {
    id: 'getDiscoveries_not_fn',
    severity: 'fatal',
    re: /getDiscoveries\s+is not a function/i,
    fix: 'AutoAdaptiveDevice._safeGetDiscoveries() typeof check before call',
    status: 'fixed_p100',
  },
  {
    id: 'getDeviceById',
    severity: 'warn',
    re: /Could not get device by id/i,
    fix: 'ZigBeeDriverFlowCardPatch global null-safe getDeviceById (P101)',
    status: 'fixed_p101',
  },
  {
    id: 'catch_on_undefined',
    severity: 'fatal',
    re: /reading ['"]catch['"]|Cannot read properties of undefined \(reading 'catch'\)/i,
    fix: 'Promise.resolve(x).catch(...) or guard return values before .catch',
    status: 'fixed_p101',
  },
  {
    id: 'registerRunListenerasync_typo',
    severity: 'fatal',
    re: /registerRunListenerasync\s+is not a function|card\.registerRunListenerasync/i,
    fix: 'registerRunListener(async ...) — never concatenate async into the method name (P19)',
    status: 'fixed_p19',
  },
  {
    id: 'settimeout_destroyed',
    severity: 'fatal',
    re: /setTimeout is not a function|Cannot read properties of undefined \(reading 'setTimeout'\)/i,
    fix: 'safeSetTimeout(this, cb, ms) from lib/utils/safe-timers.js (P19)',
    status: 'fixed_p19',
  },
  {
    id: 'onDeleted_null',
    severity: 'fatal',
    re: /reading ['_"]_onDeleted['_"]|Cannot read properties of null \(reading '_onDeleted'\)/i,
    fix: 'Call super.onDeleted after _destroyed; TuyaZigbeeDevice/UnifiedSensorBase v9.0.349 guards',
    status: 'fixed_p349',
  },
  {
    id: 'dcm_auditCapabilities_missing',
    severity: 'fatal',
    re: /auditCapabilities\s+is not a function/i,
    fix: 'Guard typeof auditCapabilities; add method on lib/dynamic/DynamicCapabilityManager',
    status: 'fixed_p108',
  },
  {
    id: 'capability_ref_undefined',
    severity: 'fatal',
    re: /ReferenceError:\s*capability is not defined|capability is not defined/i,
    fix: 'generic_tuya._autoMapDP: destructure capability + skip internal mappings',
    status: 'fixed_p136',
  },
  {
    id: 'clusterutils_destroyed_unbound',
    severity: 'fatal',
    re: /clusterUtils\.js:.*_destroyed|Timeout\._onTimeout \(\/app\/lib\/utils\/clusterUtils\.js/i,
    fix: 'clusterUtils free functions must not close over this; use globalThis.setTimeout only',
    status: 'fixed_p137',
  },
];

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function collectTextBlobs() {
  const blobs = [];
  const candidates = [
    path.join(ROOT, '.github', 'state', 'diagnostics-report.json'),
    path.join(ROOT, '.github', 'state', 'diagnostics-crossref.yml'),
    path.join(ROOT, 'diagnostics', 'summary.json'),
    path.join(ROOT, '.github', 'state', 'dashboard-monitor-report.json'),
    path.join(ROOT, '.github', 'state', 'homey-device-report.json'),
    path.join(ROOT, 'tmp', 'gmail-art', '.github', 'state', 'diagnostics-report.json'),
    path.join(ROOT, 'tmp', 'gmail-art', 'diagnostics', 'summary.json'),
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, 'utf8');
      blobs.push({ source: path.relative(ROOT, p).replace(/\\/g, '/'), text: raw });
    } catch { /* skip */ }
  }

  // Flatten structured errors from summary/report
  for (const p of [
    path.join(ROOT, 'diagnostics', 'summary.json'),
    path.join(ROOT, 'tmp', 'gmail-art', 'diagnostics', 'summary.json'),
    path.join(ROOT, '.github', 'state', 'diagnostics-report.json'),
  ]) {
    const j = readJson(p);
    if (!j) continue;
    const errors = j.errors || [];
    for (const e of errors) {
      blobs.push({
        source: path.relative(ROOT, p).replace(/\\/g, '/') + '#errors',
        text: typeof e === 'string' ? e : JSON.stringify(e),
      });
    }
    for (const d of j.diagnostics || []) {
      blobs.push({
        source: path.relative(ROOT, p).replace(/\\/g, '/') + '#diag',
        text: JSON.stringify(d).slice(0, 8000),
      });
    }
  }

  return blobs;
}

function extractSacredHints(text) {
  const mfrs = [...text.matchAll(/_TZ[A-Z0-9]+_[A-Za-z0-9]+/g)].map(m => m[0]);
  const pids = [...text.matchAll(/\bTS[0-9]{3,5}[A-Z]?\b/g)].map(m => m[0]);
  return {
    mfrs: [...new Set(mfrs)].slice(0, 20),
    pids: [...new Set(pids)].slice(0, 20),
  };
}

function main() {
  const blobs = collectTextBlobs();
  const hits = [];
  const counts = Object.fromEntries(KNOWN_PATTERNS.map(p => [p.id, 0]));
  const unknownFatals = [];

  for (const blob of blobs) {
    for (const pat of KNOWN_PATTERNS) {
      if (pat.re.test(blob.text)) {
        counts[pat.id] += 1;
        hits.push({
          pattern: pat.id,
          severity: pat.severity,
          status: pat.status,
          fix: pat.fix,
          source: blob.source,
          sacred: extractSacredHints(blob.text),
        });
      }
    }
    // Heuristic unknown TypeError fatals (ignore truncated known patterns)
    const unk = blob.text.match(/TypeError:\s*([^\n\r"']{10,120})/gi) || [];
    for (const u of unk) {
      if (KNOWN_PATTERNS.some(p => p.re.test(u))) continue;
      if (/getDeviceActi|read only property|getDiscoveries|_destroyed|reading ['"]catch['"]|registerRunListenerasync|setTimeout is not|reading ['_"]_onDeleted/i.test(u)) continue;
      // Truncated Homey emails often cut mid-message; treat as covered by known patterns
      if (/Cannot read properties of undefined \(reading\s*$/i.test(u)) continue;
      if (/TIMEOUT|MAC_NO_ACK|UNSUPPORTED/i.test(u)) continue;
      unknownFatals.push({ source: blob.source, message: u.slice(0, 160) });
    }
  }

  // Dedupe hits by pattern+source
  const seen = new Set();
  const uniqueHits = hits.filter(h => {
    const k = `${h.pattern}|${h.source}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sourcesScanned: blobs.length,
    patternCounts: counts,
    hits: uniqueHits,
    unknownFatals: unknownFatals.slice(0, 40),
    knownFixed: KNOWN_PATTERNS.filter(p => String(p.status || '').startsWith('fixed_')).map(p => p.id),
    watch: KNOWN_PATTERNS.filter(p => p.status === 'watch').map(p => p.id),
    verdict: unknownFatals.length === 0 ? 'ok' : 'review_unknown',
  };

  try {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  } catch (e) {
    console.error('Failed to write report:', e.message);
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[gmail-crash-pattern-gate] sources=${blobs.length} hits=${uniqueHits.length} unknown=${unknownFatals.length}`);
    for (const [id, n] of Object.entries(counts)) {
      if (n > 0) console.log(`  ${id}: ${n} source-hit(s)`);
    }
    console.log(`  wrote ${path.relative(ROOT, OUT)}`);
    console.log(`  verdict: ${report.verdict}`);
  }

  if (STRICT && unknownFatals.length > 0) {
    process.exit(1);
  }
}

main();
