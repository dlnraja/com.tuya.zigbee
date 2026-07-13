#!/usr/bin/env node
// test-allowlist.js
const fs = require('fs');
const c = fs.readFileSync('tools/ci/audit-johan-references.js', 'utf8');
const m = c.match(/const ALLOW_LIST = \[([\s\S]*?)\];/);
if (m) {
  const items = m[1].split(',').map(s => s.trim().match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean);
  console.log('ALLOW_LIST items (' + items.length + '):');
  for (const i of items) console.log('  - ' + i);
}
console.log('\nTest:');
const testPaths = [
  'tools/ci/audit-johan-references.js',
  'tools/ci/check-writes.js',
  '.github/workflows/publish.yml',
  '.github/workflows/publish-stable.yml',
];
const items = m ? m[1].split(',').map(s => s.trim().match(/['"]([^'"]+)['"]/)?.[1]).filter(Boolean) : [];
for (const p of testPaths) {
  const match = items.some(i => p.endsWith(i));
  console.log('  ' + p + ': ' + (match ? 'MATCH' : 'NO MATCH'));
}
