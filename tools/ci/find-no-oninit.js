#!/usr/bin/env node
// P79.1: Find drivers with simple onNodeInit (no battery, no button enrichment)
const fs = require('fs');
const path = require('path');
const DRIVERS = path.join(process.cwd(), 'drivers');

const drivers = fs.readdirSync(DRIVERS).filter(x => {
  const stat = fs.statSync(path.join(DRIVERS, x));
  return stat.isDirectory() && !x.startsWith('.');
});

const results = [];
for (const d of drivers) {
  const devFile = path.join(DRIVERS, d, 'device.js');
  if (!fs.existsSync(devFile)) continue;
  const dev = fs.readFileSync(devFile, 'utf8');
  // Only look at drivers that have very simple onNodeInit (less than 5 lines of actual code)
  if (!/onNodeInit|onInit/.test(dev)) continue;
  const onInitMatch = dev.match(/async\s+on(?:Node)?Init\s*\([^)]*\)\s*\{([^}]*)\}/);
  if (!onInitMatch) continue;
  const body = onInitMatch[1];
  const lines = body.split('\n').filter(l => l.trim() && !l.match(/^\s*\/\//)).length;
  if (lines < 3) {
    results.push({ driver: d, lines, body: body.substring(0, 80) });
  }
}

console.log(`Drivers with very simple onNodeInit (<3 lines): ${results.length}`);
for (const r of results.slice(0, 20)) {
  console.log(`  ${r.driver}: ${r.lines} lines`);
  console.log(`    body: ${r.body.replace(/\n/g, ' ').trim()}`);
}
