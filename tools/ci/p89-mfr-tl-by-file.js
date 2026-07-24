#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const files = cp.execSync(
  `powershell -NoProfile -Command "Get-ChildItem -Path 'lib' -Recurse -File -Include '*.js' | Select-Object -ExpandProperty FullName"`,
  { encoding: 'utf8' }
).split(/\r?\n/).filter(Boolean);
const out = {};
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('toLowerCase') && /manufacturer|mfr|productId|pid/i.test(lines[i])) {
      const k = f.replace(/\\/g, '/').split('lib/')[1];
      out[k] = (out[k] || 0) + 1;
    }
  }
}
const sorted = Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [k, v] of sorted) console.log(`${v}\t${k}`);
