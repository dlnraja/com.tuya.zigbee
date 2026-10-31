#!/usr/bin/env node
'use strict';
// P3088: .github/state/homey-app-diag was never present on any branch: fetch-homey-app-diag-by-uuid.js
// only mkdirs after a successful Athom fetch (fetch-diags passed HOMEY_PAT but not HOMEY_REFRESH_TOKEN,
// so it threw first), and .github/state/** is gitignored (security scanner) so nothing survived a run.
// This keeps the folder (persisted by actions/cache in fetch-diags), prunes it, and writes a small
// index (no stack, no payload) that is also uploaded with the sanitized artifact.
const fs = require('fs');
const path = require('path');

const MAX_FILES = 50;        // newest uuid reports kept on disk (raw + sanitized pairs count once)
const MAX_INDEX = 200;       // index rows
const MAX_INDEX_BYTES = 64 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function run(dir, now = new Date()) {
  fs.mkdirSync(dir, { recursive: true });
  const keep = path.join(dir, '.gitkeep');
  if (!fs.existsSync(keep)) {fs.writeFileSync(keep, '');}
  const idxPath = path.join(dir, 'index.json');
  let prev = [];
  try { prev = JSON.parse(fs.readFileSync(idxPath, 'utf8')).entries || []; } catch { prev = []; }
  const byUuid = new Map(prev.filter((e) => e && UUID.test(String(e.uuid))).map((e) => [e.uuid, e]));

  const groups = new Map();
  for (const f of fs.readdirSync(dir)) {
    const m = /^([0-9a-f-]{36})(\.sanitized)?\.json$/.exec(f);
    if (!m || !UUID.test(m[1])) {continue;}
    const p = path.join(dir, f);
    const g = groups.get(m[1]) || { files: [], mtime: 0 };
    g.files.push(p); g.mtime = Math.max(g.mtime, fs.statSync(p).mtimeMs);
    groups.set(m[1], g);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].mtime - a[1].mtime);
  sorted.slice(MAX_FILES).forEach(([, g]) => g.files.forEach((p) => fs.rmSync(p, { force: true })));
  for (const [uuid, g] of sorted.slice(0, MAX_FILES)) {
    const san = g.files.find((p) => p.endsWith('.sanitized.json')) || g.files[0];
    let j = {};
    try { j = JSON.parse(fs.readFileSync(san, 'utf8')); } catch { j = {}; }
    const s = (v) => v == null ? null : String(v).slice(0, 40);
    byUuid.set(uuid, { uuid, found: !!j.found, via: s(j.via), version: s(j.version), fetchedAt: s(j.fetchedAt) || new Date(g.mtime).toISOString() });
  }
  let entries = [...byUuid.values()].sort((a, b) => String(b.fetchedAt).localeCompare(String(a.fetchedAt))).slice(0, MAX_INDEX);
  let out;
  for (;;) {
    out = `${JSON.stringify({ updatedAt: now.toISOString(), max: MAX_INDEX, count: entries.length, entries }, null, 1)  }\n`;
    if (Buffer.byteLength(out) <= MAX_INDEX_BYTES || !entries.length) {break;}
    entries = entries.slice(0, Math.floor(entries.length * 0.8));
  }
  // no churn: rewrite only when the rows changed
  if (!(fs.existsSync(idxPath) && JSON.stringify(prev) === JSON.stringify(entries))) {fs.writeFileSync(idxPath, out);}
  return { count: entries.length, kept: Math.min(sorted.length, MAX_FILES), pruned: Math.max(0, sorted.length - MAX_FILES) };
}

module.exports = { run, MAX_FILES, MAX_INDEX, MAX_INDEX_BYTES };
if (require.main === module) {
  const dir = process.argv[2] || path.join(__dirname, '..', '..', '.github', 'state', 'homey-app-diag');
  console.log('[homey-app-diag-index]', JSON.stringify(run(dir)));
}
