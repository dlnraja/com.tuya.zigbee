#!/usr/bin/env node
'use strict';
/**
 * P3389 crash watch (t1023u): read the diagnostics reports the Gmail diag workflows already
 * produce (sanitized-diagnostics-report artifacts: .github/state/diagnostics-report.json) and the
 * committed diag ledger (data/progress/ledger.json), flag OOM / SIGABRT / CPU-limit signatures per
 * app id + version, keep a ledger and write candidate tasks for signatures never seen before.
 * Deterministic: no AI, no network, no posting. Only anonymous fields are kept (short log id,
 * app id, version, driver ids, signature) - never a user name, mail address or message body.
 *
 * usage: node scripts/ci/crash-watch.cjs [--reports=<dir|file>[,..]] [--ledger=data/progress/crash-watch-ledger.json]
 *        [--candidates=data/leads/crash-watch-candidates.json] [--diag-ledger=data/progress/ledger.json]
 *        [--summary=<file>] [--now=<iso>] [--check]
 */
const fs = require('fs');
const path = require('path');

const SIGNATURES = Object.freeze([
  { id: 'oom-json-two-byte', re: /JsonParser<unsigned short>/i, lead: 'two-byte JSON source parsed at startup (app.json / data file not one-byte)' },
  { id: 'oom-heap', re: /heap out of memory|Reached heap limit|Allocation failed|JavaScript heap|FATAL ERROR:[^\n]{0,80}(heap|memory)|out of memory|ENOMEM|used too much memory|memory limit|\bOOM\b/i, lead: 'heap limit at runtime (boot live set, caches, payload size)' },
  { id: 'sigabrt', re: /SIGABRT|signal 6\b|\bAborted\b|abort\(\)/i, lead: 'native abort (usually the heap limit)' },
  { id: 'cpu-limit', re: /too much CPU|cpu[ _-]?limit|CPU usage (limit|exceeded)|exceeded[^\n]{0,40}\bcpu\b|high cpu/i, lead: 'CPU limit (bursty reports, log rate, startup stampede)' },
  { id: 'crash-restart', re: /The app has crashed|app (was|has been) (restarted|stopped)|uncaughtException/i, lead: 'app crash / restart' },
]);

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ROOT = process.cwd();

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) { return fallback; }
}

function listReportFiles(spec) {
  const out = [];
  for (const p of String(spec || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    if (!fs.existsSync(p)) { continue; }
    const st = fs.statSync(p);
    if (st.isFile()) { out.push(p); continue; }
    const walk = (d, depth) => {
      if (depth > 6) { return; }
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) { walk(f, depth + 1); } else if (e.name === 'diagnostics-report.json') { out.push(f); }
      }
    };
    walk(p, 0);
  }
  return out.sort();
}

function appIdOf(item) {
  const m = /\[(com\.dlnraja\.tuya\.zigbee(?:\.[a-z0-9]+)?)\]/i.exec(String(item.subj || ''));
  if (m) { return m[1].toLowerCase(); }
  const v = String(item.appVersion || '');
  if (/^1\./.test(v)) { return 'com.dlnraja.tuya.zigbee.bastien'; }
  if (/^5\./.test(v)) { return 'com.dlnraja.tuya.zigbee.stable'; }
  if (/^9\./.test(v)) { return 'com.dlnraja.tuya.zigbee'; }
  return 'unknown';
}

/** Only machine text: errors, stack traces, log highlights, ledger notes. Never the user message. */
function machineText(item) {
  const parts = [];
  const push = (v) => { if (v == null) { return; } if (Array.isArray(v)) { v.forEach(push); return; } if (typeof v === 'object') { push(v.message || v.msg || v.text || v.line || JSON.stringify(v)); return; } parts.push(String(v)); };
  push(item.errs); push(item.logHighlights); push(item.signals); push(item.kb);
  if (item.crashInfo) { push(item.crashInfo.stackTraces); push(item.crashInfo.error); push(item.crashInfo.reason); }
  push(item.diagSummary); push(item.note);
  return parts.join('\n').slice(0, 200000);
}

function classify(text) {
  return SIGNATURES.filter((s) => s.re.test(text)).map((s) => s.id);
}

function observationsFromReport(file) {
  const j = readJson(file, null);
  const list = j && Array.isArray(j.diagnostics) ? j.diagnostics : [];
  const out = [];
  for (const it of list) {
    if (!it || typeof it !== 'object') { continue; }
    const sigs = classify(machineText(it));
    if (!sigs.length) { continue; }
    out.push({
      source: 'diagnostics-report', id: String(it.logIdShort || it.id || '').slice(0, 16), at: it.date || null,
      appId: appIdOf(it), version: it.appVersion || 'unknown', drivers: (it.driversInLog || it.drivers || []).slice(0, 12).map(String), sigs,
    });
  }
  return out;
}

function observationsFromDiagLedger(file) {
  const j = readJson(file, null);
  const items = j && j.items && typeof j.items === 'object' ? j.items : {};
  const out = [];
  for (const [k, it] of Object.entries(items)) {
    if (!k.startsWith('diag:') || !it || typeof it !== 'object') { continue; }
    const sigs = classify(machineText(it));
    if (!sigs.length) { continue; }
    out.push({ source: 'diag-ledger', id: String(it.logIdShort || k.slice(5, 21)), at: it.mailDate || it.date || null, appId: appIdOf(it), version: it.appVersion || 'unknown', drivers: (it.drivers || []).slice(0, 12).map(String), sigs });
  }
  return out;
}

function merge(ledger, observations, nowIso) {
  const entries = ledger.entries || {};
  const fresh = [];
  for (const o of observations) {
    for (const sig of o.sigs) {
      const key = `${sig}|${o.appId}|${o.version}`;
      let e = entries[key];
      if (!e) {
        e = { sig, appId: o.appId, version: o.version, firstSeen: o.at || nowIso, lastSeen: o.at || nowIso, count: 0, ids: [], drivers: [] };
        entries[key] = e;
        fresh.push(key);
      }
      if (o.id && e.ids.includes(o.id)) { continue; }
      e.count += 1;
      if (o.id) { e.ids = [...e.ids, o.id].slice(-20); }
      e.drivers = [...new Set([...e.drivers, ...o.drivers])].slice(0, 30);
      if (o.at && (!e.lastSeen || o.at > e.lastSeen)) { e.lastSeen = o.at; }
      if (o.at && (!e.firstSeen || o.at < e.firstSeen)) { e.firstSeen = o.at; }
    }
  }
  return { ledger: { version: 1, updated: nowIso, entries }, fresh };
}

function candidatesFor(freshKeys, entries, prev, nowIso) {
  const items = Object.assign({}, (prev && prev.items) || {});
  for (const key of freshKeys) {
    const e = entries[key];
    const sig = SIGNATURES.find((s) => s.id === e.sig);
    items[key] = items[key] || {
      status: 'open', created: nowIso, sig: e.sig, appId: e.appId, version: e.version,
      task: `Investigate ${e.sig} on ${e.appId} ${e.version}: ${sig ? sig.lead : ''}. Evidence: diag ${e.ids.join(', ') || '?'}; drivers ${e.drivers.join(', ') || '?'}.`,
    };
  }
  return { version: 1, updated: nowIso, items };
}

function summaryMarkdown(ledger, fresh, files) {
  const rows = Object.entries(ledger.entries).sort((a, b) => String(b[1].lastSeen).localeCompare(String(a[1].lastSeen))).slice(0, 40);
  const lines = ['## Crash watch (P3389)', '', `Reports read: ${files}. Signatures tracked: ${Object.keys(ledger.entries).length}. New this run: ${fresh.length}.`, ''];
  if (rows.length) {
    lines.push('| signature | app | version | count | last seen | drivers |', '|---|---|---|---|---|---|');
    for (const [k, e] of rows) { lines.push(`| ${e.sig}${fresh.includes(k) ? ' (new)' : ''} | ${e.appId} | ${e.version} | ${e.count} | ${e.lastSeen || ''} | ${e.drivers.slice(0, 6).join(', ')} |`); }
  } else {
    lines.push('No OOM / SIGABRT / CPU-limit signature in the reports read.');
  }
  return `${lines.join('\n')}\n`;
}

function run(opts = {}) {
  const nowIso = opts.now || new Date().toISOString();
  const files = listReportFiles(opts.reports);
  const obs = [];
  for (const f of files) { obs.push(...observationsFromReport(f)); }
  if (opts.diagLedger && fs.existsSync(opts.diagLedger)) { obs.push(...observationsFromDiagLedger(opts.diagLedger)); }
  const prevLedger = readJson(opts.ledger, { version: 1, entries: {} });
  const { ledger, fresh } = merge(prevLedger, obs, nowIso);
  const prevCand = readJson(opts.candidates, { version: 1, items: {} });
  const candidates = candidatesFor(fresh, ledger.entries, prevCand, nowIso);
  const md = summaryMarkdown(ledger, fresh, files.length);
  if (!opts.check) {
    if (opts.ledger) { fs.mkdirSync(path.dirname(opts.ledger), { recursive: true }); fs.writeFileSync(opts.ledger, `${JSON.stringify(ledger, null, 1)}\n`); }
    if (opts.candidates) { fs.mkdirSync(path.dirname(opts.candidates), { recursive: true }); fs.writeFileSync(opts.candidates, `${JSON.stringify(candidates, null, 1)}\n`); }
    if (opts.summary) { fs.appendFileSync(opts.summary, md); }
  }
  return { files: files.length, observations: obs.length, fresh, ledger, candidates, md };
}

if (require.main === module) {
  const r = run({
    reports: arg('reports', '.github/state'),
    ledger: arg('ledger', path.join(ROOT, 'data/progress/crash-watch-ledger.json')),
    candidates: arg('candidates', path.join(ROOT, 'data/leads/crash-watch-candidates.json')),
    diagLedger: arg('diag-ledger', path.join(ROOT, 'data/progress/ledger.json')),
    summary: arg('summary', process.env.GITHUB_STEP_SUMMARY || ''),
    now: arg('now', undefined),
    check: process.argv.includes('--check'),
  });
  process.stdout.write(r.md);
  console.log(`[P3389] crash watch: ${r.files} report file(s), ${r.observations} observation(s), ${r.fresh.length} new signature(s)`);
}

module.exports = { run, classify, appIdOf, machineText, SIGNATURES };
