#!/usr/bin/env node
'use strict';
// P3097 (t641u): every new fix/lesson ships with its GHA automation. Warn (never fail) when a script
// under tools/ or scripts/ is not referenced by any workflow, by package.json, or by another script,
// and is not in the frozen baseline. --update rewrites the baseline.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const BASE = path.join(ROOT, 'config', 'unwired-scripts-baseline.json');
const EXT = /\.(js|cjs|mjs|sh|py)$/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (EXT.test(e.name)) out.push(p);
  }
  return out;
}

function unwired() {
  const scripts = [...walk(path.join(ROOT, 'tools')), ...walk(path.join(ROOT, 'scripts'))];
  const wfDir = path.join(ROOT, '.github', 'workflows');
  let corpus = fs.readdirSync(wfDir).map((f) => fs.readFileSync(path.join(wfDir, f), 'utf8')).join('\n');
  corpus += fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
  const texts = new Map(scripts.map((s) => [s, fs.readFileSync(s, 'utf8')]));
  const allText = [...texts.values()].join('\n');
  return scripts.filter((s) => {
    const rel = path.relative(ROOT, s).split(path.sep).join('/');
    const base = path.basename(s).replace(EXT, '');
    if (corpus.includes(rel) || corpus.includes(path.basename(s))) return false;
    // referenced (required/sourced) from another script counts as wired
    const own = texts.get(s);
    return !allText.replace(own, '').includes(base);
  }).map((s) => path.relative(ROOT, s).split(path.sep).join('/')).sort();
}

function main() {
  const list = unwired();
  if (process.argv.includes('--update')) { fs.writeFileSync(BASE, JSON.stringify(list, null, 2) + '\n'); console.log(`baseline: ${list.length}`); return; }
  const base = new Set(fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : []);
  const fresh = list.filter((f) => !base.has(f));
  for (const f of fresh) console.log(`::warning file=${f}::P3097 script not called by any workflow/package.json/script — add its GHA automation (rule AUTOMATION_FIRST)`);
  console.log(`unwired: ${list.length} (baseline ${base.size}, new ${fresh.length})`);
}

if (require.main === module) main();
module.exports = { unwired };
