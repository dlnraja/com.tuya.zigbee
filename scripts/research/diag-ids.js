#!/usr/bin/env node
'use strict';
/**
 * P2936: normalise diag / crash / mail / CI report dumps into data/diag-ids.json (ids only, no text
 * kept beyond a 300-char anonymised excerpt). Inputs: any JSON files given on the command line —
 * Gmail search exports ({threads:[{messages:[{subject,snippet,date,...}]}]}), .github/state/diagnostics-report.json,
 * or plain arrays. Each report keeps: id, date, kind, mfrs, pids, logIds, and the unit-level couples
 * (mfr + pid in the same message only). Then cross-research.js --items=diags cross-checks them.
 *   node scripts/research/diag-ids.js <file.json> [...]
 */
const fs = require('fs');
const path = require('path');
const { MFR_RE, PID_RE, all } = require('./lib/ref-index');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(ROOT, 'data/diag-ids.json');
const LOG_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const anon = (s) => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').slice(0, 300);

function* messages(j) {
  if (Array.isArray(j)) { for (const x of j) yield x; return; }
  for (const t of j.threads || []) for (const m of t.messages || []) yield m;
  for (const k of ['diagnostics', 'reports', 'items']) for (const x of j[k] || []) yield x;
}
const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return { reports: [] }; } })();
const byId = new Map(prev.reports.map((r) => [r.id, r]));
for (const f of process.argv.slice(2)) {
  let raw = fs.readFileSync(f, 'utf8'); const s = raw.indexOf('{'); raw = raw.slice(s, raw.lastIndexOf('}') + 1);
  let j; try { j = JSON.parse(raw); } catch { continue; }
  for (const m of messages(j)) {
    const text = [m.subject, m.snippet, m.body, m.text, m.message].filter(Boolean).join('\n');
    const mfrs = all(MFR_RE, text); if (!mfrs.length) continue;
    const pids = all(PID_RE, text).map((p) => p.toUpperCase());
    const id = String(m.id || m.logId || m.messageId || `${m.date}-${mfrs[0]}`);
    const kind = /crash/i.test(text) ? 'crash' : /diagnostic/i.test(text) ? 'diag' : /community|forum/i.test(m.subject || '') ? 'forum-mail' : /github/i.test(m.sender || '') ? 'github-mail' : 'mail';
    byId.set(id, { id, date: m.date, kind, mfrs, pids, logIds: (text.match(LOG_RE) || []).slice(0, 3),
      couples: pids.length === 1 ? mfrs.map((x) => [x, pids[0]]) : [], url: m.viewUrl ? 'gmail' : m.url, excerpt: anon(m.subject) });
  }
}
const reports = [...byId.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
fs.writeFileSync(OUT, `${JSON.stringify({ note: 'P2936 ids extracted from Homey diag/crash/mail/CI reports (ids only)', updated: new Date().toISOString(), reports }, null, 1)}\n`);
console.log(`[diag-ids] ${reports.length} reports with ids`);
