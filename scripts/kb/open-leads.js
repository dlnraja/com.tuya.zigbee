#!/usr/bin/env node
'use strict';

/**
 * P3019: scan the local KB mirrors ($KB_DIR, filled by scripts/kb/refresh.sh) for the protocol
 * leads that still lack a reliable source (data/leads/open-protocol-leads.json). Read-only on the
 * repo: writes $KB_DIR/index/open-leads-hits.json and prints a short summary for the routine.
 * A hit is only a candidate: a human/agent must read it and confirm before any decoder is added.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LEADS = path.join(ROOT, 'data', 'leads', 'open-protocol-leads.json');
const MAX_FILE = 2 * 1024 * 1024;
const MAX_HITS = 40;

function* walk(dir, depth = 0) {
  if (depth > 12) { return; }
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return; }
  for (const e of ents) {
    if (e.name === '.git' || e.name === 'node_modules' || (depth === 0 && e.name === 'index')) { continue; }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { yield* walk(p, depth + 1); } else if (e.isFile()) { yield p; }
  }
}

/** Lines of `text` that satisfy one lead (every `all` term in the file, one `any` regex on the line). */
function matchLead(lead, text) {
  const g = lead.grep || {};
  if ((g.all || []).some((t) => !text.includes(t))) { return []; }
  const any = (g.any || []).map((r) => new RegExp(r, 'i'));
  const out = [];
  text.split('\n').forEach((line, i) => {
    if (out.length < 5 && any.some((r) => r.test(line))) { out.push({ line: i + 1, text: line.trim().slice(0, 200) }); }
  });
  return out;
}

function scan(kbDir, leads) {
  const res = {};
  for (const lead of leads) { res[lead.id] = []; }
  for (const file of walk(kbDir)) {
    let st; try { st = fs.statSync(file); } catch (_e) { continue; }
    if (st.size > MAX_FILE) { continue; }
    let text = null;
    for (const lead of leads) {
      if (res[lead.id].length >= MAX_HITS) { continue; }
      if (!new RegExp((lead.grep || {}).files || '.').test(file)) { continue; }
      if (text === null) { try { text = fs.readFileSync(file, 'utf8'); } catch (_e) { break; } }
      const lines = matchLead(lead, text);
      if (lines.length) { res[lead.id].push({ file: path.relative(kbDir, file), lines }); }
    }
  }
  return res;
}

if (require.main === module) {
  const kbDir = process.env.KB_DIR || '/workspace/kb';
  const { open } = JSON.parse(fs.readFileSync(LEADS, 'utf8'));
  const hits = fs.existsSync(kbDir) ? scan(kbDir, open) : {};
  const outDir = path.join(kbDir, 'index');
  try { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'open-leads-hits.json'), JSON.stringify({ hits, queries: Object.fromEntries(open.map((l) => [l.id, l.queries])) }, null, 1)); } catch (_e) { /* read-only KB dir */ }
  for (const l of open) {
    const known = new Set(l.known_files || []);
    const fresh = (hits[l.id] || []).filter((h) => !known.has(h.file));
    console.log(`[open-leads] ${l.id}: ${fresh.length} NEW candidate file(s)${fresh.length ? ` -> ${fresh.map((h) => h.file).join(', ')}` : ''}; web queries: ${l.queries.join(' | ')}`);
  }
}

module.exports = { matchLead, scan };
