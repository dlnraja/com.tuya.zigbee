#!/usr/bin/env node
'use strict';
/**
 * scripts/ci/workflow-about.js — writes a short "about" header at the top of every workflow (P3069, t585u).
 *
 * The text lives in .github/workflow-about.json: one sentence on what the workflow does, in our own words,
 * and the people/projects whose ideas it builds on. Keeping it in data means the header is reviewed like
 * code, stays the same shape everywhere and can be refreshed in one go. Only the marked block is touched;
 * everything else in the file (older comments included) is left as it is.
 *
 *   node scripts/ci/workflow-about.js --check   # exit 1 if a header is missing or stale
 *   node scripts/ci/workflow-about.js --write   # add / refresh the headers
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIR = path.join(ROOT, '.github', 'workflows');
const DATA = path.join(ROOT, '.github', 'workflow-about.json');
const START = '# >>> about (P3069)';
const END = '# <<< about';
const RULES = 'free GitHub minutes; any AI step is optional and stays inside included free quotas; public posting stays off or ledger-gated.';

function wrap(prefix, text, width = 110) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = prefix;
  for (const w of words) {
    if (cur.length + w.length + 1 > width && cur.trim() !== prefix.trim()) { lines.push(cur); cur = '#   ' + w; }
    else cur += (cur.endsWith(' ') ? '' : ' ') + w;
  }
  lines.push(cur);
  return lines;
}

function block(entry, groups) {
  const thanks = [...(groups[entry.group] || []), ...(entry.also_thanks || [])];
  return [
    `${START} — generated from .github/workflow-about.json, edit there then run scripts/ci/workflow-about.js --write`,
    ...wrap('# What it does:', entry.what),
    ...wrap('# Ideas from (thank you):', thanks.join('; ') + '.'),
    ...wrap('# Ground rules:', RULES),
    END,
  ].join('\n');
}

function apply(src, blk) {
  const s = src.replace(/^\uFEFF/, '');
  const i = s.indexOf(START);
  if (i >= 0) {
    const j = s.indexOf(END, i);
    if (j >= 0) return s.slice(0, i) + blk + s.slice(j + END.length);
  }
  return blk + '\n' + s;
}

function run(mode) {
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  const files = fs.readdirSync(DIR).filter((f) => /\.ya?ml(\.manual)?$/.test(f)).sort();
  const missing = []; const stale = []; let written = 0;
  for (const f of files) {
    const e = data.workflows[f];
    if (!e) { missing.push(f); continue; }
    const p = path.join(DIR, f);
    const src = fs.readFileSync(p, 'utf8');
    const next = apply(src, block(e, data.groups));
    if (next !== src) {
      if (mode === 'write') { fs.writeFileSync(p, next); written++; } else stale.push(f);
    }
  }
  return { files: files.length, missing, stale, written };
}

if (require.main === module) {
  const mode = process.argv.includes('--write') ? 'write' : 'check';
  const r = run(mode);
  if (r.missing.length) console.error(r.missing.map((f) => `::error::${f} has no entry in .github/workflow-about.json`).join('\n'));
  if (r.stale.length) console.error(r.stale.map((f) => `::error::${f} about header missing or stale (run node scripts/ci/workflow-about.js --write)`).join('\n'));
  console.log(`[workflow-about] ${mode}: ${r.files} workflow file(s), ${r.written} written, ${r.stale.length} stale, ${r.missing.length} without entry`);
  process.exit(r.missing.length || r.stale.length ? 1 : 0);
}
module.exports = { block, apply, run, START, END };
