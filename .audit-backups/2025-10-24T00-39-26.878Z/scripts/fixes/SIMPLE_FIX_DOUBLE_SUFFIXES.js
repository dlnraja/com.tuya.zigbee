#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 SIMPLE FIX: Replace all double suffixes in app.json\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
let appJsonStr = fs.readFileSync(appJsonPath, 'utf8');

const replacements = [
  { from: /ikea_ikea_/g, to: 'ikea_', name: 'ikea_ikea_' },
  { from: /_other_other/g, to: '_other', name: '_other_other' },
  { from: /_aaa_aaa/g, to: '_aaa', name: '_aaa_aaa' },
  { from: /_aa_aa/g, to: '_aa', name: '_aa_aa' },
  { from: /_internal_internal/g, to: '_internal', name: '_internal_internal' }
];

let totalReplaced = 0;

for (const replacement of replacements) {
  const before = appJsonStr;
  appJsonStr = appJsonStr.replace(replacement.from, replacement.to);
  const matches = (before.match(replacement.from) || []).length;
  
  if (matches > 0) {
    console.log(`  ✅ Replaced ${matches} occurrences of "${replacement.name}"`);
    totalReplaced += matches;
  }
}

// Validate JSON
try {
  JSON.parse(appJsonStr);
  console.log(`\n✅ JSON is still valid after replacements\n`);
} catch (error) {
  console.error(`\n❌ ERROR: JSON is invalid after replacements!`);
  console.error(error.message);
  process.exit(1);
}

// Write back
fs.writeFileSync(appJsonPath, appJsonStr, 'utf8');

console.log(`📊 Total: ${totalReplaced} double suffix occurrences replaced\n`);

process.exit(0);
