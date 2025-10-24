#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIXING ALL DOUBLE SUFFIX REFERENCES IN app.json\n');

const appJsonPath = path.join(__dirname, '..', '..', 'app.json');
const appJsonStr = fs.readFileSync(appJsonPath, 'utf8');
let appJson = JSON.parse(appJsonStr);

// Define all double suffix patterns to fix
const patterns = [
  { from: /ikea_ikea_/g, to: 'ikea_' },
  { from: /_other_other/g, to: '_other' },
  { from: /_aaa_aaa/g, to: '_aaa' },
  { from: /_aa_aa/g, to: '_aa' },
  { from: /_internal_internal/g, to: '_internal' }
];

function applyFixes(str) {
  if (typeof str !== 'string') return str;
  
  let result = str;
  for (const pattern of patterns) {
    result = String(result).replace(pattern.from, pattern.to);
  }
  return result;
}

function fixObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => fixObject(item));
  }
  
  const fixed = {};
  for (const key in obj) {
    const value = obj[key];
    
    // Fix string values
    if (typeof value === 'string') {
      fixed[key] = applyFixes(value);
    }
    // Recursively fix objects and arrays
    else if (typeof value === 'object') {
      fixed[key] = fixObject(value);
    }
    // Keep other values as is
    else {
      fixed[key] = value;
    }
  }
  
  return fixed;
}

console.log('Applying fixes to entire app.json...\n');

// Fix the entire JSON structure recursively
appJson = fixObject(appJson);

// Write back
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log('✅ All double suffix references fixed in app.json\n');

// Count how many changes were made
const newAppJsonStr = JSON.stringify(appJson, null, 2);
const oldMatches = (appJsonStr.match(/ikea_ikea_|_other_other|_aaa_aaa|_aa_aa|_internal_internal/g) || []).length;
const newMatches = (newAppJsonStr.match(/ikea_ikea_|_other_other|_aaa_aaa|_aa_aa|_internal_internal/g) || []).length;

console.log(`📊 Statistics:`);
console.log(`   Before: ${oldMatches} double suffix occurrences`);
console.log(`   After: ${newMatches} double suffix occurrences`);
console.log(`   Fixed: ${oldMatches - newMatches} occurrences\n`);

process.exit(0);
