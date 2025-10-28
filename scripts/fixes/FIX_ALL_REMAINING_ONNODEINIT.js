#!/usr/bin/env node
'use strict';

/**
 * FIX_ALL_REMAINING_ONNODEINIT.js
 * 
 * Corrige TOUS les drivers individuels qui appellent super sans paramètres
 * 
 * Patterns à corriger:
 * 1. async onNodeInit() { await super.onNodeInit(); }
 * 2. async onNodeInit() { super.onNodeInit(); }
 * 
 * Devient:
 * async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFiles = 0;
let fixedFiles = 0;
let errors = 0;

console.log('🔧 Fixing REMAINING onNodeInit in individual drivers...\n');

/**
 * Fix onNodeInit in individual driver file
 */
function fixDriverOnNodeInit(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: Fix onNodeInit signature (empty parentheses)
    // Before: async onNodeInit() {
    // After:  async onNodeInit({ zclNode }) {
    content = content.replace(
      /async\s+onNodeInit\s*\(\s*\)\s*{/g,
      'async onNodeInit({ zclNode }) {'
    );
    
    // Pattern 2: Fix super call without await
    // Before: super.onNodeInit();
    // After:  await super.onNodeInit({ zclNode });
    content = content.replace(
      /(\s+)super\.onNodeInit\(\s*\);/g,
      '$1await super.onNodeInit({ zclNode });'
    );
    
    // Pattern 3: Fix super call with await
    // Before: await super.onNodeInit();
    // After:  await super.onNodeInit({ zclNode });
    content = content.replace(
      /await\s+super\.onNodeInit\(\s*\);/g,
      'await super.onNodeInit({ zclNode });'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const relPath = path.relative(process.cwd(), filePath);
      console.log(`✅ Fixed: ${relPath}`);
      fixedFiles++;
      return true;
    }
    
    return false;
  } catch (err) {
    console.error(`❌ Error fixing ${filePath}:`, err.message);
    errors++;
    return false;
  }
}

/**
 * Recursively find all device.js files
 */
function findDeviceFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findDeviceFiles(fullPath));
      } else if (item === 'device.js') {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading ${dir}:`, err.message);
  }
  
  return files;
}

// Main execution
console.log(`📂 Scanning ${DRIVERS_DIR}...\n`);

const deviceFiles = findDeviceFiles(DRIVERS_DIR);
totalFiles = deviceFiles.length;

console.log(`Found ${totalFiles} device.js files\n`);

deviceFiles.forEach(file => {
  fixDriverOnNodeInit(file);
});

console.log('\n' + '='.repeat(60));
console.log('✅ FIX COMPLETE!');
console.log('='.repeat(60));
console.log(`Total files scanned: ${totalFiles}`);
console.log(`Files fixed: ${fixedFiles}`);
console.log(`Errors: ${errors}`);
console.log('='.repeat(60));

if (fixedFiles > 0) {
  console.log('\n📝 Next steps:');
  console.log('  1. git add drivers/');
  console.log('  2. git commit -m "fix: Correct REMAINING onNodeInit in ALL drivers - pass zclNode"');
  console.log('  3. git push origin master');
  console.log('  4. Run: node tools/test_onNodeInit.js (to verify)');
}

process.exit(errors > 0 ? 1 : 0);
