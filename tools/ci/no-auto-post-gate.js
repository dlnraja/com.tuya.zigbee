#!/usr/bin/env node
'use strict';
// Report-only gate (add --strict to fail): lists scripts that look like they POST to the forum,
// GitHub comments or mail without going through scripts/lib/post-guard.js.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DIRS = ['.github/scripts', 'scripts'];
const POST = /(method:\s*['"]POST['"][\s\S]{0,400}(posts\.json|\/comments)|\/posts\.json['"`][\s\S]{0,200}POST|issues\.createComment|gh (issue|pr) comment|sendMail\(|smtp)/i;
const hits = [];
function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) { if (f.name !== 'node_modules') {walk(p);} continue; }
    if (!/\.(js|mjs|cjs)$/.test(f.name)) {continue;}
    const s = fs.readFileSync(p, 'utf8');
    if (POST.test(s) && !s.includes('post-guard')) {hits.push(path.relative(ROOT, p));}
  }
}
for (const d of DIRS) {if (fs.existsSync(path.join(ROOT, d))) {walk(path.join(ROOT, d));}}
console.log(`[no-auto-post] ${hits.length} unguarded posting script(s)`);
for (const h of hits) {console.log(`  - ${h}`);}
if (process.argv.includes('--strict') && hits.length) {process.exit(1);}
