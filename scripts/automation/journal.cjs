#!/usr/bin/env node
'use strict';
/**
 * P3048 — shared automation journal (deterministic, Node built-ins only, no AI, no network).
 *
 * One JSON line per automation run in data/progress/automation-journal.jsonl:
 *   { at, workflow, status, summary, key, notified, run? , data? }
 * Every automation workflow reads the last 72 h before acting and skips what an earlier run already
 * did or reported (same dedup key). Rotation: above MAX_LINES the oldest lines move to
 * data/progress/archive/automation-journal-<YYYY-MM>.jsonl (append only, nothing deleted).
 * Corrupt lines are dropped by repair() and counted in a journal line (self-heal).
 * .gitattributes marks the journal merge=union so two appends never conflict on rebase.
 *
 * CLI:
 *   node scripts/automation/journal.cjs append --workflow=W --status=ok --summary="…" --key=K [--notified=yes] [--force]
 *   node scripts/automation/journal.cjs seen --key=K [--hours=72]        (exit 0 seen, 1 not seen)
 *   node scripts/automation/journal.cjs tail [--hours=72]
 *   node scripts/automation/journal.cjs rotate [--max=2000] [--keep=1500]
 *   node scripts/automation/journal.cjs repair
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEFAULT_FILE = path.join(ROOT, 'data', 'progress', 'automation-journal.jsonl');
const MAX_LINES = 2000;
const KEEP_LINES = 1500;
const STATUSES = new Set(['ok', 'skip', 'warn', 'fail', 'transient', 'rerun', 'recovered', 'held', 'info']);

function fileOf(opts) { return (opts && opts.file) || process.env.AUTOMATION_JOURNAL || DEFAULT_FILE; }

function parseLines(text) {
  const good = []; let bad = 0;
  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      if (o && typeof o === 'object' && typeof o.at === 'string' && typeof o.workflow === 'string') good.push(o); else bad++;
    } catch { bad++; }
  }
  return { entries: good, bad };
}

function readAll(opts = {}) {
  const f = fileOf(opts);
  if (!fs.existsSync(f)) return [];
  return parseLines(fs.readFileSync(f, 'utf8')).entries;
}

function readSince(hours = 72, opts = {}) {
  const now = opts.now ? Date.parse(opts.now) : Date.now();
  const min = now - hours * 3600000;
  return readAll(opts).filter((e) => { const t = Date.parse(e.at); return Number.isFinite(t) && t >= min; });
}

/** seen(key) -> the newest entry with this key in the window, or null. */
function seen(key, opts = {}) {
  if (!key) return null;
  const hit = readSince(opts.hours || 72, opts).filter((e) => e.key === key);
  if (opts.notifiedOnly) return hit.filter((e) => e.notified === true).pop() || null;
  return hit.pop() || null;
}

function normalize(entry, now) {
  const status = STATUSES.has(entry.status) ? entry.status : 'info';
  const o = {
    at: entry.at || new Date(now || Date.now()).toISOString(),
    workflow: String(entry.workflow || 'unknown').slice(0, 80),
    status,
    summary: String(entry.summary || '').replace(/\s+/g, ' ').trim().slice(0, 400),
    key: entry.key ? String(entry.key).slice(0, 200) : null,
    notified: entry.notified === true || /^(1|yes|true|oui)$/i.test(String(entry.notified || '')),
  };
  if (entry.run) o.run = String(entry.run).slice(0, 40);
  if (entry.data && typeof entry.data === 'object') {
    const s = JSON.stringify(entry.data);
    o.data = s.length <= 2000 ? entry.data : { truncated: true };
  }
  return o;
}

/**
 * append(entry) -> { appended, reason, entry }
 * Skips (dedup) when the same key with the same status is already in the last 72 h, unless force.
 */
function append(entry, opts = {}) {
  const f = fileOf(opts);
  const e = normalize(entry, opts.now ? Date.parse(opts.now) : undefined);
  if (e.key && !opts.force) {
    const prev = seen(e.key, { ...opts, hours: opts.hours || 72 });
    if (prev && prev.status === e.status) return { appended: false, reason: `duplicate key ${e.key} (${prev.at})`, entry: prev };
  }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let prefix = '';
  if (fs.existsSync(f)) { const st = fs.statSync(f); if (st.size > 0) { const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(1); fs.readSync(fd, b, 0, 1, st.size - 1); fs.closeSync(fd); if (b[0] !== 10) prefix = '\n'; } }
  fs.appendFileSync(f, `${prefix}${JSON.stringify(e)}\n`);
  return { appended: true, reason: 'appended', entry: e };
}

function archiveFile(f, at) {
  const m = /^(\d{4}-\d{2})/.exec(String(at || '')) || [null, 'undated'];
  return path.join(path.dirname(f), 'archive', `${path.basename(f, '.jsonl')}-${m[1]}.jsonl`);
}

/** rotate() -> { moved, kept }: oldest lines beyond max go to monthly archive files (append only). */
function rotate(opts = {}) {
  const f = fileOf(opts);
  const max = opts.max || MAX_LINES; const keep = Math.min(opts.keep || KEEP_LINES, max);
  if (!fs.existsSync(f)) return { moved: 0, kept: 0 };
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
  if (lines.length <= max) return { moved: 0, kept: lines.length };
  const old = lines.slice(0, lines.length - keep);
  const groups = new Map();
  for (const l of old) {
    let at = ''; try { at = JSON.parse(l).at; } catch { /* corrupt line archived as undated */ }
    const a = archiveFile(f, at); if (!groups.has(a)) groups.set(a, []); groups.get(a).push(l);
  }
  for (const [a, ls] of groups) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.appendFileSync(a, `${ls.join('\n')}\n`); }
  fs.writeFileSync(f, `${lines.slice(-keep).join('\n')}\n`);
  return { moved: old.length, kept: keep };
}

/** repair() -> { dropped }: rewrites the journal without corrupt lines (self-heal, d). */
function repair(opts = {}) {
  const f = fileOf(opts);
  if (!fs.existsSync(f)) return { dropped: 0 };
  const { entries, bad } = parseLines(fs.readFileSync(f, 'utf8'));
  if (bad) fs.writeFileSync(f, entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : ''));
  return { dropped: bad };
}

module.exports = { DEFAULT_FILE, MAX_LINES, KEEP_LINES, parseLines, readAll, readSince, seen, append, rotate, repair, normalize };

if (require.main === module) {
  const [cmd] = process.argv.slice(2);
  const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
  const flag = (k) => process.argv.includes(`--${k}`);
  if (cmd === 'append') {
    const r = append({ workflow: arg('workflow'), status: arg('status', 'info'), summary: arg('summary', ''), key: arg('key'), notified: arg('notified', 'no'), run: arg('run', process.env.GITHUB_RUN_ID) }, { force: flag('force') });
    console.log(`[journal] ${r.appended ? 'appended' : 'skipped'}: ${r.reason}`);
  } else if (cmd === 'seen') {
    const s = seen(arg('key'), { hours: Number(arg('hours', 72)) });
    console.log(s ? JSON.stringify(s) : 'not seen');
    process.exit(s ? 0 : 1);
  } else if (cmd === 'tail') {
    for (const e of readSince(Number(arg('hours', 72)))) console.log(JSON.stringify(e));
  } else if (cmd === 'rotate') {
    console.log(JSON.stringify(rotate({ max: Number(arg('max', MAX_LINES)), keep: Number(arg('keep', KEEP_LINES)) })));
  } else if (cmd === 'repair') {
    console.log(JSON.stringify(repair()));
  } else {
    console.error('usage: journal.cjs <append|seen|tail|rotate|repair> [--key=…]');
    process.exit(2);
  }
}
