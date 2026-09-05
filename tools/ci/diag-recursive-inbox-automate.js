#!/usr/bin/env node
'use strict';

/**
 * diag-recursive-inbox-automate.js (P2233)
 *
 * Automates: list missing Gmail msg IDs → ingest bodies → recursive treat → investigation summary.
 *
 * WHY: Same f647 paste-analysis for every diag/crash/interview without manual loops.
 * HOW: Local inbox under .github/state/diag-recursive-inbox/ (gitignored) + treat script.
 * POUR QUI: IDE MCP ingest + CI after fetch-gmail-diagnostics.
 *
 * Usage:
 *   node tools/ci/diag-recursive-inbox-automate.js
 *   node tools/ci/diag-recursive-inbox-automate.js --ingest-jsonl=path.jsonl
 *   node tools/ci/diag-recursive-inbox-automate.js --from-diagnostics-report
 *   node tools/ci/diag-recursive-inbox-automate.js --list-missing
 *   node tools/ci/diag-recursive-inbox-automate.js --treat-only
 *
 * JSONL lines: {"id":"<gmailMsgId>","plaintextBody":"..."} or {"messageId","body"}
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const INBOX = path.join(ROOT, '.github', 'state', 'diag-recursive-inbox');
const BODIES = path.join(INBOX, 'bodies');
const IDS_FILE = path.join(INBOX, 'gmail-msg-ids-all.json');
const MISSING_FILE = path.join(INBOX, 'missing-ids.txt');
const STATUS_FILE = path.join(INBOX, 'automate-status.json');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

function ensureDirs() {
  fs.mkdirSync(BODIES, { recursive: true });
}

function loadIds() {
  if (!fs.existsSync(IDS_FILE)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
    return Array.isArray(j.messageIds) ? j.messageIds : [];
  } catch {
    return [];
  }
}

function existingBodies() {
  if (!fs.existsSync(BODIES)) return new Set();
  return new Set(
    fs.readdirSync(BODIES)
      .filter((n) => n.endsWith('.txt'))
      .map((n) => n.replace(/\.txt$/i, '')),
  );
}

function computeMissing() {
  const ids = loadIds();
  const have = existingBodies();
  const missing = ids.filter((id) => !have.has(id));
  fs.writeFileSync(MISSING_FILE, `${missing.join('\n')}${missing.length ? '\n' : ''}`);
  return { total: ids.length, have: have.size, missing: missing.length, missingIds: missing };
}

function saveBody(id, text) {
  if (!id || !text || String(text).length < 40) return false;
  const file = path.join(BODIES, `${id}.txt`);
  if (fs.existsSync(file) && fs.statSync(file).size > 200) return false;
  fs.writeFileSync(file, String(text));
  return true;
}

function ingestJsonl(filePath) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) throw new Error(`missing jsonl: ${abs}`);
  let written = 0;
  const raw = fs.readFileSync(abs, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    const id = row.id || row.messageId || row.message_id;
    const body = row.plaintextBody || row.body || row.text || row.plainText;
    if (saveBody(id, body)) written += 1;
  }
  return written;
}

/**
 * Best-effort: rebuild short treat seeds from diagnostics-report enriched fields
 * when full bodies are absent (CI often strips bodies for privacy).
 */
function ingestFromDiagnosticsReport() {
  const reportPath = path.join(ROOT, '.github', 'state', 'diagnostics-report.json');
  if (!fs.existsSync(reportPath)) return 0;
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  let written = 0;
  for (const d of report.diagnostics || []) {
    const id = d.id;
    if (!id) continue;
    const bits = [
      d.logId ? `Log ID: ${d.logId}` : '',
      d.appVersion ? `App Version: v${d.appVersion}` : '',
      d.userMessage ? `User Message: ${d.userMessage}` : '',
      (d.couples || []).map((c) => `manufacturerName: ${c.mfr} modelId: ${c.pid}`).join('\n'),
      (d.driversInLog || []).map((x) => `[Driver:${x}]`).join(' '),
      (d.signals || []).map((s) => `signal:${s.id || s}`).join('\n'),
      (d.logHighlights || []).join('\n'),
      (d.errs || []).join('\n'),
      (d.crashInfo?.stackTraces || []).join('\n'),
      d.diagSummary || '',
      d.subj || '',
    ].filter(Boolean);
    const text = bits.join('\n');
    if (text.length < 80) continue;
    if (saveBody(id, text)) written += 1;
  }
  return written;
}

function runTreat() {
  const script = path.join(ROOT, 'tools', 'ci', 'recursive-diag-interview-treat.js');
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  return r.status === 0;
}

function writeStatus(extra = {}) {
  const miss = computeMissing();
  const date = new Date().toISOString().slice(0, 10);
  const treatDir = path.join(ROOT, 'reports', `diag-recursive-treat-${date}`);
  let summary = null;
  const sumPath = path.join(treatDir, 'SUMMARY.json');
  if (fs.existsSync(sumPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(sumPath, 'utf8'));
    } catch { /* ignore */ }
  }
  const status = {
    updatedAt: new Date().toISOString(),
    inbox: miss,
    treatSummary: summary
      ? {
          sourcesScanned: summary.sourcesScanned,
          uniqueCases: summary.uniqueCases,
          actionable: summary.actionable,
          gmailBodiesPresent: summary.gmailBodiesPresent,
          interviews: summary.interviews,
          signalTally: summary.signalTally,
        }
      : null,
    treatDir: fs.existsSync(treatDir) ? path.relative(ROOT, treatDir).replace(/\\/g, '/') : null,
    policy: 'silent — no forum/PM; never invent sacred couples; never commit raw bodies',
    ...extra,
  };
  fs.writeFileSync(STATUS_FILE, `${JSON.stringify(status, null, 2)}\n`);
  return status;
}

function main() {
  ensureDirs();

  if (flag('list-missing')) {
    const m = computeMissing();
    console.log(JSON.stringify(m, null, 2));
    process.exit(0);
  }

  let ingested = 0;
  const jsonl = arg('ingest-jsonl');
  if (jsonl) ingested += ingestJsonl(jsonl);
  if (flag('from-diagnostics-report')) ingested += ingestFromDiagnosticsReport();

  const missBefore = computeMissing();
  console.log(`[automate] inbox total=${missBefore.total} have=${missBefore.have} missing=${missBefore.missing} ingested_now=${ingested}`);

  if (!flag('treat-only') && !flag('skip-treat')) {
    const ok = runTreat();
    if (!ok) process.exit(1);
  } else if (flag('treat-only')) {
    const ok = runTreat();
    if (!ok) process.exit(1);
  }

  const status = writeStatus({ ingested });
  console.log('[automate] status →', path.relative(ROOT, STATUS_FILE));
  console.log(JSON.stringify(status.inbox, null, 2));
  if (status.treatSummary) {
    console.log('[automate] actionable=', status.treatSummary.actionable, 'gmailBodies=', status.treatSummary.gmailBodiesPresent);
  }
  if (status.inbox.missing > 0) {
    console.log(`[automate] still missing ${status.inbox.missing} bodies — MCP get_message or CI diag:gmail:history`);
    process.exitCode = 0; // soft: missing is expected until ingest completes
  }
}

main();
