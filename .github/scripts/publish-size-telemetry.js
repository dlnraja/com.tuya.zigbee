#!/usr/bin/env node
'use strict';
// WHY(P2900, 20/10/2026 Paris): socket hang up / AggregateError correlate with payload size, but we only had
// sizes for master runs that reached the retry step. This writes one CSV row per upload attempt on all three
// apps (archive gz size, payload bytes, file count, app.json bytes, drivers, version, outcome) and the
// workflow uploads it as the "publish-size-telemetry" artifact. Read-only on the payload; never fails a job.
//   node publish-size-telemetry.js measure <publishDir>        -> reports/publish-size/current.json
//   node publish-size-telemetry.js record <outcome> [kind]     -> appends reports/publish-size/publish-size.csv
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Outside the repo tree so no bot commit step can pick it up.
const OUT = process.env.PUBLISH_SIZE_DIR || path.join(process.env.RUNNER_TEMP || require('os').tmpdir(), 'publish-size');
const HEAD = 'at_utc,branch,app_id,version,run_id,run_attempt,retry,payload_bytes,payload_files,archive_gz_bytes,app_json_bytes,drivers,flow_cards,outcome,kind';

function walk(dir) {
  let bytes = 0; let files = 0;
  const st = [dir];
  while (st.length) {
    const d = st.pop();
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (_e) { continue; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '.git') st.push(p); } else if (e.isFile()) { files++; bytes += fs.statSync(p).size; }
    }
  }
  return { bytes, files };
}

function archiveGz(dir) {
  // Same shape the CLI uploads (tar.gz of the publish dir); streamed to a byte counter, no temp file.
  try { return execFileSync('bash', ['-c', 'tar --exclude=.git -czf - -C "$1" . | wc -c', '_', dir], { encoding: 'utf8', maxBuffer: 1 << 20 }).trim() * 1; } catch (_e) { return null; }
}

function measure(dir) {
  const r = walk(dir);
  let appJson = 0; let drivers = 0; let flows = 0; let id = ''; let version = '';
  try {
    const raw = fs.readFileSync(path.join(dir, 'app.json'));
    appJson = raw.length;
    const j = JSON.parse(raw);
    id = j.id || ''; version = j.version || '';
    drivers = (j.drivers || []).length;
    const f = j.flow || {};
    flows = ['triggers', 'conditions', 'actions'].reduce((n, k) => n + ((f[k] || []).length), 0);
  } catch (_e) { /* no app.json */ }
  return { payload_bytes: r.bytes, payload_files: r.files, archive_gz_bytes: archiveGz(dir), app_json_bytes: appJson, drivers, flow_cards: flows, app_id: id, version };
}

function csvCell(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function main() {
  const [cmd, a, b] = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });
  const cur = path.join(OUT, 'current.json');
  if (cmd === 'measure') {
    const m = measure(a || '.');
    fs.writeFileSync(cur, JSON.stringify(m, null, 2));
    const mb = (x) => (x == null ? '?' : (x / 1048576).toFixed(2));
    console.log(`[size-telemetry] v${m.version} payload ${mb(m.payload_bytes)} MB / ${m.payload_files} files, archive ${mb(m.archive_gz_bytes)} MB gz, app.json ${mb(m.app_json_bytes)} MB, ${m.drivers} drivers, ${m.flow_cards} flow cards`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `| upload v${m.version} | archive ${mb(m.archive_gz_bytes)} MB gz | payload ${mb(m.payload_bytes)} MB | app.json ${mb(m.app_json_bytes)} MB |\n`);
    return;
  }
  if (cmd === 'record') {
    let m = {};
    try { m = JSON.parse(fs.readFileSync(cur, 'utf8')); } catch (_e) { /* not measured */ }
    if (process.env.HOMEY_EXPECTED_VERSION) m.version = process.env.HOMEY_EXPECTED_VERSION;
    const row = [new Date().toISOString(), process.env.GITHUB_REF_NAME || '', m.app_id, m.version, process.env.GITHUB_RUN_ID || '', process.env.GITHUB_RUN_ATTEMPT || '', process.env.TRANSIENT_RETRY || '0', m.payload_bytes, m.payload_files, m.archive_gz_bytes, m.app_json_bytes, m.drivers, m.flow_cards, a || 'unknown', b || ''];
    const csv = path.join(OUT, 'publish-size.csv');
    if (!fs.existsSync(csv)) fs.writeFileSync(csv, HEAD + '\n');
    fs.appendFileSync(csv, row.map(csvCell).join(',') + '\n');
    console.log(`[size-telemetry] recorded ${a} ${b || ''} for v${m.version}`);
    return;
  }
  console.log('usage: measure <dir> | record <outcome> [kind]');
}

module.exports = { measure, HEAD };
if (require.main === module) { try { main(); } catch (e) { console.log(`::warning::size telemetry skipped: ${e.message}`); } }
