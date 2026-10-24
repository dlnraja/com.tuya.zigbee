#!/usr/bin/env node
'use strict';
// WHY(P3025, 25/10/2026 Paris): stable's re-upload loop classified the WHOLE multi-build status output and fell
// back to "unknown" (budget 0) when Athom's processing_failed row had no error text, so a plain "socket hang up"
// flake (v5.12.36x, 21/10: 12 red runs) was never retried. This is the per-version classifier Bastien already
// used inline, shared by stable + bastien (+ master copy, byte-identical) with one more failover source:
//   1) the build-status row of THIS version  2) the wait-athom-draft-ready log (stdout holds "socket hang up")
//   3) no error text anywhere -> transient (Athom history: empty processing_failed = mostly socket hang up).
// It never widens what is retried: an explicit unknown error text keeps budget 0; tip-lag (row absent or not
// processing_failed) is reported as "not-failed" so callers do not re-upload.
// Usage: node athom-classify-failure.js --version 5.12.360 [--wait-log FILE] < homey-build-status.jsonl
const fs = require('fs');
const { classify } = require('./athom-retry-policy');

const ERR_FIELD_RE = /"[a-zA-Z]*(err|reason|message|log)[a-zA-Z]*"\s*:\s*"[^"]+/i;

function rowFor(statusText, version) {
  const needle = `"version":"${version}"`;
  return String(statusText || '').split('\n').find((l) => l.replace(/\s+/g, '').includes(needle)) || '';
}

function classifyFailure({ statusText = '', version = '', waitLog = '' } = {}) {
  const row = rowFor(statusText, version);
  if (row && !/processing_failed/i.test(row)) return { kind: 'not-failed', source: 'row', row };
  let kind = row ? classify(row) : 'unknown';
  if (kind !== 'unknown') return { kind, source: 'row', row };
  const fromLog = classify(waitLog);
  if (fromLog !== 'unknown') return { kind: fromLog, source: 'wait-log', row };
  if (!row && !/processing_failed/i.test(waitLog)) return { kind: 'not-failed', source: 'none', row };
  if (!ERR_FIELD_RE.test(row)) return { kind: 'transient', source: 'empty-error-fallback', row };
  return { kind: 'unknown', source: 'row', row };
}

module.exports = { classifyFailure, rowFor };

if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ''; };
  const version = get('--version') || process.env.HOMEY_EXPECTED_VERSION || '';
  const wl = get('--wait-log');
  let statusText = '';
  try { statusText = fs.readFileSync(0, 'utf8'); } catch (_) { /* no stdin */ }
  const waitLog = wl && fs.existsSync(wl) ? fs.readFileSync(wl, 'utf8') : '';
  const r = classifyFailure({ statusText, version, waitLog });
  if (args.includes('--json')) console.log(JSON.stringify({ kind: r.kind, source: r.source }));
  else console.log(r.kind);
  process.stderr.write(`[athom-classify] v${version}: ${r.kind} (source: ${r.source})\n`);
}
