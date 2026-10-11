#!/usr/bin/env node
'use strict';
/**
 * Rule "native first, non-native optional" (docs/rules/ZIGBEE_TUYA_RULES.md §Non-native never mandatory).
 *
 * Static check: a driver's onNodeInit/onInit must never abort (throw, or bare early `return`) because a
 * non-native cluster (Tuya 0xEF00/61184, 0xE000/57344, 0xE001/57345, manufacturer-specific) is missing.
 * Base operation has to come up from native ZCL clusters; the Tuya DP layer is a bonus that is skipped
 * when absent. The check only looks at code that runs directly in the init body: nested functions
 * (callbacks, helpers defined there and called later) and try blocks are skipped because they do not
 * abort init. Exit 1 on any finding. Companion of scripts/gates/native-matrix-gate.js (manifest side).
 *
 *   node scripts/gates/init-non-native-guard.js [--root=DIR] [--json]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(__dirname, '..', '..'));
const NON_NATIVE = /(tuya|ef00|61184|0xef00|0xe000|0xe001|57344|57345|manuSpecific|manufacturerSpecific)/i;
const INIT_RE = /(?:^|[\n{};])\s*(?:async\s+)?(onNodeInit|onInit)\s*\([^)]*\)\s*\{/g;

// Returns the text between the brace at `open` and its match, skipping strings and comments.
function matchBlock(src, open) {
  let d = 0; let q = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i]; const n = src[i + 1];
    if (q) { if (c === '\\') { i++; } else if (c === q) { q = null; } continue; }
    if (c === '/' && n === '/') { const e = src.indexOf('\n', i); if (e < 0) { return src.length; } i = e; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) { return src.length; } i = e + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') { d++; } else if (c === '}') { d--; if (d === 0) { return i; } }
  }
  return src.length;
}

// Blank out nested function bodies and try blocks so only code that can abort init remains.
function directInitCode(body) {
  let out = body;
  const opener = /(=>\s*\{|\bfunction\b[^{]*\{|\btry\s*\{|\b(?:catch|then|finally)\s*(?:\([^)]*\))?\s*\{)/g;
  let m;
  while ((m = opener.exec(out))) {
    const open = m.index + m[0].length - 1;
    const close = matchBlock(out, open);
    out = out.slice(0, open + 1) + out.slice(open + 1, close).replace(/[^\n]/g, ' ') + out.slice(close);
    opener.lastIndex = open + 1;
  }
  return out;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const hits = [];
  let m;
  INIT_RE.lastIndex = 0;
  while ((m = INIT_RE.exec(src))) {
    const open = m.index + m[0].length - 1;
    const close = matchBlock(src, open);
    const lines = directInitCode(src.slice(open + 1, close)).split('\n');
    const base = src.slice(0, open).split('\n').length;
    lines.forEach((l, k) => {
      const ctx = lines.slice(Math.max(0, k - 4), k + 1).join('\n');
      if (/\bthrow\b/.test(l) && NON_NATIVE.test(ctx)) { hits.push({ line: base + k, method: m[1], code: l.trim() }); }
      const guard = lines.slice(Math.max(0, k - 1), k + 1).join(' ');
      if (/\breturn\b\s*;?/.test(l) && /if\s*\(\s*!\s*[\w.?[\]'"]*?(tuya|ef00|61184)/i.test(guard)) {
        hits.push({ line: base + k, method: m[1], code: guard.replace(/\s+/g, ' ').trim() });
      }
    });
  }
  return hits;
}

function main() {
  const dir = path.join(ROOT, 'drivers');
  const findings = [];
  for (const id of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, id, 'device.js');
    if (!fs.existsSync(f)) { continue; }
    for (const h of scanFile(f)) { findings.push({ file: path.relative(ROOT, f), ...h }); }
  }
  // Shared base classes run the same init path for many drivers.
  const walk = (d) => {
    if (!fs.existsSync(d)) { return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); } else if (e.name.endsWith('.js')) {
        for (const h of scanFile(p)) { findings.push({ file: path.relative(ROOT, p), ...h }); }
      }
    }
  };
  walk(path.join(ROOT, 'lib'));
  if (process.argv.includes('--json')) { console.log(JSON.stringify(findings, null, 1)); }
  console.log(`[init-non-native-guard] drivers + lib scanned, findings=${findings.length}`);
  for (const f of findings) { console.error(`init aborts without non-native cluster: ${f.file}:${f.line} (${f.method}) ${f.code}`); }
  return findings.length ? 1 : 0;
}

if (require.main === module) { process.exit(main()); }
module.exports = { scanFile, directInitCode };
