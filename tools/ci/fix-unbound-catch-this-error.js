#!/usr/bin/env node
/**
 * P117 — Fix unbound .catch(this.error) crash vector (Gmail unbound_destroyed).
 * Replaces with bound-safe catch using _boundError / error.call.
 *
 * Usage:
 *   node tools/ci/fix-unbound-catch-this-error.js
 *   node tools/ci/fix-unbound-catch-this-error.js --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DRIVERS = path.join(ROOT, 'drivers');

const REPLACEMENTS = [
  // Common patterns — longest first
  [/\.catch\(\s*this\.error\.bind\(\s*this\s*\)\s*\)/g, '.catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }))'],
  [/\.catch\(\s*this\.error\s*\)/g, '.catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }))'],
];

const report = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (name.endsWith('.js')) {
      let s = fs.readFileSync(p, 'utf8');
      if (!/\.catch\(\s*this\.error/.test(s)) continue;
      let hits = 0;
      let next = s;
      for (const [re, rep] of REPLACEMENTS) {
        const before = next;
        next = next.replace(re, () => { hits += 1; return rep; });
        if (next === before && re.source.includes('bind')) {
          // no-op
        }
      }
      // Also catch this.log unbound in catch (less critical but related)
      if (hits === 0 && /\.catch\(\s*this\.error\s*\)/.test(s)) {
        // fallback count
        hits = (s.match(/\.catch\(\s*this\.error\s*\)/g) || []).length;
      }
      if (next !== s) {
        report.push({ file: path.relative(ROOT, p).replace(/\\/g, '/'), hits });
        if (APPLY) fs.writeFileSync(p, next);
      }
    }
  }
}

walk(DRIVERS);
// also lib/drivers commonly used
for (const extra of ['lib']) {
  const d = path.join(ROOT, extra);
  if (fs.existsSync(d)) walk(d);
}

const outDir = path.join(ROOT, '.github', 'state');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'fix-unbound-catch-report.json'),
  `${JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', files: report.length, hits: report.reduce((a, b) => a + b.hits, 0), report }, null, 2)}\n`,
);
console.log(`P117 unbound catch: ${report.length} files, ${report.reduce((a, b) => a + b.hits, 0)} hits ${APPLY ? 'APPLIED' : '(dry-run)'}`);
for (const r of report.slice(0, 15)) console.log(`  ${r.file} x${r.hits}`);
if (report.length > 15) console.log(`  … +${report.length - 15} more`);

// Gate mode: fail CI when residual unbound catches remain (unless --apply)
const GATE = process.argv.includes('--gate') || process.env.UNBOUND_CATCH_GATE === '1';
if (GATE && !APPLY && report.reduce((a, b) => a + b.hits, 0) > 0) {
  console.error('[unbound-catch-gate] FAIL — residual .catch(this.error) hits');
  process.exit(1);
}
if (GATE) console.log('[unbound-catch-gate] PASS');
