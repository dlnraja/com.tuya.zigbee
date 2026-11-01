'use strict';
/**
 * P3146: find couples that the forum harvester built by cross-multiplying a table post
 * (one post listing >=2 makers and >=2 pids). A couple is suspect when no kb source
 * (Z2M/ZHC/deCONZ/ZHA/Johan) confirms it, no single-couple post backs it and no diag names the maker.
 * Usage: node scripts/maintenance/forum-table-crossproduct-scan.js [--json]
 */
const fs = require('fs');
const path = require('path');
const g = require('../ci/couple-removal-guard.js');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

function scan() {
  const head = g.loadDrivers((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), fs.readdirSync(path.join(ROOT, 'drivers')));
  const kb = new Set(Object.keys(readJson('data/kb/couples.json').couples || {}).map((k) => k.toLowerCase()));
  const diag = JSON.stringify(readJson('data/diag-ids.json')).toLowerCase();
  const byPost = {};
  for (const c of readJson('data/forum/forum-leads-ssot.json').couples || []) {
    for (const p of c.posts || []) {(byPost[p] = byPost[p] || []).push(c);}
  }
  const isTable = (cs) => cs && new Set(cs.map((c) => c.mfr.toLowerCase())).size > 1 && new Set(cs.map((c) => c.pid)).size > 1;
  const out = [];
  for (const [post, cs] of Object.entries(byPost)) {
    if (!isTable(cs)) {continue;}
    for (const c of cs) {
      const m = c.mfr.toLowerCase();
      if (kb.has(`${m}|${c.pid}`.toLowerCase()) || diag.includes(m)) {continue;}
      if (c.posts.some((p) => p !== post && !isTable(byPost[p]))) {continue;}
      const matched = Object.keys(head).filter((d) => [...head[d].m].some((x) => x.toLowerCase() === m) && head[d].p.has(c.pid));
      out.push({ post, couple: `${c.mfr}|${c.pid}`, matched });
    }
  }
  return out;
}

if (require.main === module) {
  const r = scan();
  if (process.argv.includes('--json')) {console.log(JSON.stringify(r, null, 1));}
  else {for (const x of r) {console.log(`${x.couple}\t${x.matched.join(',') || '-'}\t${x.post}`);}}
}
module.exports = { scan };
