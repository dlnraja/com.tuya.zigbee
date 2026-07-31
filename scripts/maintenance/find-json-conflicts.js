#!/usr/bin/env node
const fs = require('fs');
const cp = require('child_process');
const files = cp.execSync(
  `powershell -NoProfile -Command "Get-ChildItem -Path drivers -Recurse -File -Filter driver.compose.json | Select-Object -ExpandProperty FullName"`,
  { encoding: 'utf8' }
).split(/\r?\n/).filter(Boolean);
let found = 0;
for (const f of files) {
  try {
    const c = fs.readFileSync(f, 'utf8');
    if (c.includes('<<<<<<< HEAD') || c.includes('=======') && c.includes('>>>>>>>')) {
      console.log('CONFLICT: ' + f);
      found++;
    }
  } catch (e) {}
}
console.log(`Total: ${found} conflicts`);
