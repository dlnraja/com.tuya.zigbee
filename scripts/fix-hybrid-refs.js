#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Fix all _hybrid references in critical app files
 * after the directory rename refactor
 */

const files = [
  'app.json',
  'data/fingerprints.json',
  'driver-mapping-database.json'
];

let totalFixed = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`⚠️  ${file}: NOT FOUND`);
    continue;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  const before = (content.match(/_hybrid/g) || []).length;
  
  // Remove _hybrid suffix from driver IDs (before closing quote)
  // Pattern: _hybrid" or _hybrid' or _hybrid, or _hybrid} or _hybrid]
  content = content.replace(/_hybrid(?=["',\}\]\s])/g, '');
  
  // Also handle _hybrid at end of string values
  content = content.replace(/_hybrid$/gm, '');
  
  const after = (content.match(/_hybrid/g) || []).length;
  const fixed = before - after;
  totalFixed += fixed;
  
  fs.writeFileSync(file, content);
  console.log(`✅ ${file}: ${before} → ${after} _hybrid refs (${fixed} fixed)`);
}

console.log(`\n🎯 Total fixed: ${totalFixed}`);