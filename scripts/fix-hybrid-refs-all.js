#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Remove ALL _hybrid references from ALL JSON files in drivers/
 * and other critical app files
 */

const driversDir = 'drivers';
let totalFixed = 0;
let filesFixed = 0;

function fixFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const before = (content.match(/_hybrid/g) || []).length;
  if (before === 0) return;
  
  content = content.replace(/_hybrid/g, '');
  const after = (content.match(/_hybrid/g) || []).length;
  const fixed = before - after;
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, content);
    totalFixed += fixed;
    filesFixed++;
    console.log(`✅ ${filePath}: ${before} → ${after} (${fixed} fixed)`);
  }
}

// Fix all JSON files in drivers/
const drivers = fs.readdirSync(driversDir).filter(d => {
  try { return fs.statSync(path.join(driversDir, d)).isDirectory(); }
  catch(e) { return false; }
});

for (const drv of drivers) {
  const drvPath = path.join(driversDir, drv);
  const files = fs.readdirSync(drvPath).filter(f => f.endsWith('.json'));
  for (const file of files) {
    fixFile(path.join(drvPath, file));
  }
}

// Also fix app.json, fingerprints.json, driver-mapping-database.json
fixFile('app.json');
fixFile('data/fingerprints.json');
fixFile('driver-mapping-database.json');

console.log(`\n🎯 Total: ${filesFixed} files fixed, ${totalFixed} _hybrid references removed`);