#!/usr/bin/env node
'use strict';
// R21 static runtime-safety check (heuristic, per file). Runs on files changed vs a base ref
// (default origin/master) or on explicit paths. Flags:
//  - setInterval without clearInterval in the same file
//  - module-level Map/Set/object caches without any cap/TTL/eviction hint (delete/clear/size/MAX/TTL)
//  - .on()/.addListener() registrations without any removeListener/off/removeAllListeners in a device/driver
//  - while(true)/for(;;) loops without break/return
//  - JSON.parse(JSON.stringify(require(...))) per-instance deep copies of shared data
// Usage: node tools/ci/runtime-safety-gate.js [--base <ref>] [files...]
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

function checkSource(src, file = '') {
  const issues = [];
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  if (/\bsetInterval\s*\(/.test(code) && !/\bclearInterval\s*\(/.test(code)) { issues.push('setInterval without clearInterval'); }
  const cacheDecl = code.match(/^(?:const|let|var)\s+(\w+)\s*=\s*new\s+(?:Map|Set)\s*\(/gm) || [];
  for (const decl of cacheDecl) {
    const name = decl.match(/^(?:const|let|var)\s+(\w+)/)[1];
    // A Set/Map that is never mutated (.add/.set) is a constant lookup table, not a cache.
    if (!new RegExp(`${name}\\.(add|set)\\s*\\(`).test(code)) { continue; }
    // Explicit, reviewed bound written next to the code: `// r21-bounded: <name> <reason>`.
    if (new RegExp(`r21-bounded:\\s*${name}\\b`).test(src)) { continue; }
    const bounded = new RegExp(`${name}\\.(delete|clear)\\s*\\(|${name}\\.size\\s*[<>]=?|MAX|TTL|maxSize|ttl`, 'i').test(code);
    if (!bounded) { issues.push(`module-level ${name} has no cap/TTL/eviction`); }
  }
  const isDeviceLike = /drivers\/|Device|Base\.js$/.test(file);
  // Short-lived http request/response/stream objects die with the request: not device listeners.
  const longLived = code.replace(/\b(req|res|request|response|stream|socket)\.on\(/g, '');
  if (isDeviceLike && /\.(on|addListener)\(\s*['"`]/.test(longLived) && !/\.(removeListener|off|removeAllListeners)\s*\(/.test(code)) {
    issues.push('listeners registered without any removal (onDeleted/onUninit)');
  }
  const loops = code.match(/while\s*\(\s*true\s*\)\s*\{[\s\S]*?\n\s*\}|for\s*\(\s*;\s*;\s*\)\s*\{[\s\S]*?\n\s*\}/g) || [];
  for (const l of loops) { if (!/\b(break|return|throw)\b/.test(l)) { issues.push('infinite loop without break/return'); } }
  if (/JSON\.parse\(\s*JSON\.stringify\(\s*require\(/.test(code)) { issues.push('deep copy of required shared data'); }
  return issues;
}

function changedFiles(base) {
  try {
    const out = execSync(`git -C "${ROOT}" diff --name-only --diff-filter=AM ${base}...HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const staged = execSync(`git -C "${ROOT}" diff --name-only --diff-filter=AM HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const untracked = execSync(`git -C "${ROOT}" ls-files --others --exclude-standard`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return [...new Set(`${out}\n${staged}\n${untracked}`.split('\n').filter(Boolean))];
  } catch { return []; }
}

module.exports = { checkSource };

if (require.main === module) {
  const args = process.argv.slice(2);
  const bi = args.indexOf('--base');
  const base = bi >= 0 ? args[bi + 1] : 'origin/master';
  const explicit = args.filter((a, i) => a !== '--base' && (bi < 0 || i !== bi + 1));
  const files = (explicit.length ? explicit : changedFiles(base))
    .filter((f) => /^(lib|drivers|scripts|tools|\.github\/scripts)\/.*\.(c?js)$/.test(f) && fs.existsSync(path.join(ROOT, f)));
  let n = 0;
  for (const f of files) {
    for (const i of checkSource(fs.readFileSync(path.join(ROOT, f), 'utf8'), f)) { console.error(`[runtime-safety] ${f}: ${i}`); n++; }
  }
  if (n) { console.error(`[runtime-safety] FAIL ${n} issue(s) in ${files.length} changed file(s) (R21)`); process.exit(1); }
  console.log(`[runtime-safety] OK ${files.length} changed file(s) checked`);
}
