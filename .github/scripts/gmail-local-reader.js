#!/usr/bin/env node
/**
 * gmail-local-reader.js
 *
 * LOCAL EMULATOR of gmail-imap-reader.js / gmail-oauth-reader.js.
 *
 * Why: in CI, `fetch-gmail-diagnostics.js` reads from real Gmail (IMAP or OAuth).
 * Locally, we don't have GMAIL_EMAIL/GMAIL_APP_PASSWORD/GMAIL_REFRESH_TOKEN.
 * This module provides the SAME toEmailRecord() output shape using the
 * already-downloaded data we have in .github/state/ + .diag/ + docs/.
 *
 * Source priority (newest first):
 *   1. .github/state/diagnostics-report.json (Gmail, even if empty)
 *   2. .diag/*.json (extracted herdsman, comments audit)
 *   3. .github/state/homey-device-report.json (Homey runtime)
 *   4. .github/state/forum-activity-data.json
 *   5. .github/state/pr-issue-scan.json
 *   6. .github/state/pattern-data.json
 *   7. docs/FORUM_ISSUES_*.md, docs/GITHUB_ISSUES_*.md
 *
 * Output: same shape as gmail-imap-reader.js:
 *   [{ id, subj, from, fromName, date, body, bodyLength, contentType,
 *      pseudo, crashData, mimeInfo, labels }]
 *
 * Use:
 *   const { readLocally } = require('./gmail-local-reader');
 *   const emails = readLocally();
 *
 * @author Mavis investigation 2026-07-10
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MASTER = path.resolve(__dirname, '..', '..');
const STATE = path.join(MASTER, '.github', 'state');
const DIAG = path.join(MASTER, '.diag');
const DOCS = path.join(MASTER, 'docs');

function safeReadJSON(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  catch { return null; }
}

function safeRead(file) {
  try {
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf8');
  }
  catch { return ''; }
}

function pseudoFromForum(text) {
  const m = text.match(/(?:^|\n)\s*\[([a-zA-Z0-9_.-]+)\]/);
  return m ? { displayName: m[1], username: m[1], source: 'forum' } : null;
}

function pseudoFromGH(text) {
  const m = text.match(/(?:^|\n)\s*@?([a-zA-Z0-9_-]+)\s+(?:opened|closed|commented|pushed)/);
  return m ? { displayName: m[1], username: m[1], source: 'github' } : null;
}

function extractMfr(text) {
  const m = text.match(/_(TZ\d|TZE\d|TYZB\d|TYST\d|Z[A-Z]{2})_[a-zA-Z0-9]+/);
  return m ? m[0] : null;
}

function extractCrashData(body) {
  if (!body) return null;
  const data = {};
  const stacks = body.match(/(?:Error|TypeError|ReferenceError|RangeError)[:\s][^\n]+/g);
  if (stacks) data.stackTraces = stacks.slice(0, 5);
  const crashApp = (body.match(/(?:app|application)[:\s]+([a-z0-9_.]+)/i) || [])[1];
  if (crashApp) data.crashApp = crashApp;
  const caps = body.match(/\b(onoff|dim|measure_power|measure_temperature|measure_humidity|measure_battery|meter_power|alarm_[a-z_]+|measure_[a-z_]+)\b/g);
  if (caps) data.capabilities = [...new Set(caps)];
  const dps = body.match(/\bDP[:\s]?(\d{1,3})\b/gi);
  if (dps) data.datapoints = [...new Set(dps.map(d => d.replace(/^DP[:\s]?/i, '')))];
  return Object.keys(data).length ? data : null;
}

function toEmailRecord({ id, subject, from, date, body, source }) {
  const safeBody = String(body || '').substring(0, 256000);
  return {
    id,
    subj: subject || '[no subject]',
    from: from || 'unknown',
    fromName: '',
    date: date || new Date().toISOString(),
    body: safeBody,
    bodyLength: safeBody.length,
    contentType: 'text/plain',
    pseudo: { displayName: null, username: null, source: source || 'local' },
    crashData: extractCrashData(safeBody),
    mimeInfo: { parts: [], headerKeys: [] },
    labels: ['local', source].filter(Boolean),
  };
}

function readFromGmailState() {
  const report = safeReadJSON(path.join(STATE, 'diagnostics-report.json'));
  if (!report || !report.diagnostics || report.diagnostics.length === 0) {
    return [];
  }
  return report.diagnostics.map((d, i) => toEmailRecord({
    id: `gmail-state-${i}-${Date.now()}`,
    subject: d.subject || `Diagnostic #${i}`,
    from: d.from || 'diagnostics@athom.com',
    date: d.date,
    body: d.body || d.stderr || d.stdout || JSON.stringify(d, null, 2),
    source: 'gmail-state',
  }));
}

function readFromDiagFolder() {
  const out = [];
  if (!fs.existsSync(DIAG)) return out;
  const johanAudit = path.join(DIAG, 'johan-shadow-comments-audit.json');
  if (fs.existsSync(johanAudit)) {
    try {
      const data = JSON.parse(fs.readFileSync(johanAudit, 'utf8'));
      // It's a 2.5MB array of comments. Pull a sample.
      const comments = Array.isArray(data) ? data : (data.comments || data.items || []);
      for (let i = 0; i < Math.min(20, comments.length); i++) {
        const c = comments[i];
        out.push(toEmailRecord({
          id: `johan-audit-${c.id || i}-${Date.now()}`,
          subject: c.title || c.subject || `[Johan Shadow] Comment #${i}`,
          from: c.user || c.username || 'johan-shadow',
          date: c.date || c.createdAt,
          body: c.body || c.text || JSON.stringify(c, null, 2),
          source: 'johan-shadow-audit',
        }));
      }
    }
    catch { /* ignore */ }
  }
  return out;
}

function readFromHomeyDeviceReport() {
  const report = safeReadJSON(path.join(STATE, 'homey-device-report.json'));
  if (!report || !report.devices) return [];
  return report.devices.slice(0, 20).map((d, i) => toEmailRecord({
    id: `homey-device-${i}-${Date.now()}`,
    subject: `Homey device report: ${d.name || d.driver || 'unknown'}`,
    from: 'homey-device-report',
    date: d.lastSeen || d.date,
    body: `Device: ${d.name}\nDriver: ${d.driver}\nMfr: ${d.manufacturerName}\nPID: ${d.modelId}\nError: ${d.error || 'none'}`,
    source: 'homey-device-report',
  }));
}

function readFromForumActivity() {
  const report = safeReadJSON(path.join(STATE, 'forum-activity-data.json'));
  if (!report) return [];
  const posts = report.recentPosts || report.posts || report.topics || [];
  return posts.slice(0, 20).map((p, i) => toEmailRecord({
    id: `forum-activity-${i}-${Date.now()}`,
    subject: p.title || p.subject || `[Forum] Post #${i}`,
    from: `forum/${p.username || 'anonymous'}`,
    date: p.createdAt || p.date,
    body: p.excerpt || p.text || p.body || '',
    source: 'forum-activity',
  }));
}

function readFromPrIssueScan() {
  const scan = safeReadJSON(path.join(STATE, 'pr-issue-scan.json'));
  if (!scan) return [];
  const out = [];
  for (const pr of (scan.prs || []).slice(0, 10)) {
    out.push(toEmailRecord({
      id: `pr-${pr.number}-${Date.now()}`,
      subject: `[PR #${pr.number}] ${pr.title}`,
      from: `github/${pr.user || 'unknown'}`,
      date: pr.createdAt,
      body: pr.body || '',
      source: 'pr-scan',
    }));
  }
  for (const iss of (scan.issues || []).slice(0, 10)) {
    out.push(toEmailRecord({
      id: `issue-${iss.number}-${Date.now()}`,
      subject: `[Issue #${iss.number}] ${iss.title}`,
      from: `github/${iss.user || 'unknown'}`,
      date: iss.createdAt,
      body: iss.body || '',
      source: 'issue-scan',
    }));
  }
  return out;
}

function readFromDocs() {
  const out = [];
  const files = [
    'FORUM_ISSUES_ANALYSIS.md',
    'FORUM_ISSUES_CONSOLIDATED.md',
    'GITHUB_ISSUES_PR_ANALYSIS.md',
    'GITHUB_RESPONSES_FULL.md',
    'ISSUE_RESPONSES.md',
    'USER_EXPERIENCE_TRACKER.md',
  ];
  for (const f of files) {
    const full = path.join(DOCS, f);
    if (!fs.existsSync(full)) continue;
    const content = safeRead(full);
    // Find headers like "## #127 Tauno20 — WZ-M100" or "## Issue #1: ..."
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^#{2,3}\s*(?:#?\d+|Issue\s*#?\d+)\s*[:—\-]?\s*(.+)/);
      if (m) {
        // Collect body (next 5-20 lines until next header)
        const body = [];
        for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
          if (/^#{2,3}\s/.test(lines[j])) break;
          body.push(lines[j]);
        }
        out.push(toEmailRecord({
          id: `doc-${f}-${m[1].slice(0, 30).replace(/\W+/g, '-')}-${i}`,
          subject: m[1].trim().substring(0, 200),
          from: `docs/${f.replace('.md', '')}`,
          date: null,
          body: body.join('\n').substring(0, 5000),
          source: 'docs',
        }));
        if (out.length >= 50) return out;
      }
    }
  }
  return out;
}

function readLocally(opts = {}) {
  const all = [
    ...readFromGmailState(),
    ...readFromDiagFolder(),
    ...readFromHomeyDeviceReport(),
    ...readFromForumActivity(),
    ...readFromPrIssueScan(),
    ...readFromDocs(),
  ];
  if (opts.limit) return all.slice(0, opts.limit);
  return all;
}

function summary() {
  const stats = {
    gmailState: readFromGmailState().length,
    diagFolder: readFromDiagFolder().length,
    homeyDevice: readFromHomeyDeviceReport().length,
    forumActivity: readFromForumActivity().length,
    prIssueScan: readFromPrIssueScan().length,
    docs: readFromDocs().length,
  };
  stats.total = Object.values(stats).reduce((a, b) => a + b, 0);
  return stats;
}

if (require.main === module) {
  console.log('Gmail Local Reader — sources summary:');
  const s = summary();
  for (const [k, v] of Object.entries(s)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`\nTotal: ${s.total} "emails" (locally emulated)`);
  console.log('\nFirst 5:');
  const emails = readLocally({ limit: 5 });
  for (const e of emails) {
    console.log(`  - [${e.pseudo.source}] ${e.subj.substring(0, 70)}`);
  }
}

module.exports = { readLocally, summary, toEmailRecord };
