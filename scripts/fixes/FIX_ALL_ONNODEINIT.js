#!/usr/bin/env node
'use strict';

/**
 * FIX_ALL_ONNODEINIT.js
 * 
 * Corrige TOUS les fichiers device.js qui ont une signature onNodeInit incorrecte
 * 
 * Correction:
 * ❌ async onNodeInit() { await super.onNodeInit(); }
 * ✅ async onNodeInit({ zclNode }) { await super.onNodeInit({ zclNode }); }
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFiles = 0;
let fixedFiles = 0;
let errors = 0;

console.log('🔧 Fixing onNodeInit signature in ALL drivers...\n');

/**
 * Fix onNodeInit signature in a file
 */
function fixOnNodeInit(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: async onNodeInit() { ... await super.onNodeInit();
    // Replace with: async onNodeInit({ zclNode }) { ... await super.onNodeInit({ zclNode });
    
    // Fix signature
    content = content.replace(
      /async onNodeInit\(\)\s*{/g,
      'async onNodeInit({ zclNode }) {'
    );
    
    // Fix super call
    content = content.replace(
      /await super\.onNodeInit\(\);/g,
      'await super.onNodeInit({ zclNode });'
    );
    
    // Also fix cases without await
    content = content.replace(
      /super\.onNodeInit\(\);/g,
      'super.onNodeInit({ zclNode });'
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
  fixOnNodeInit(file);
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
  console.log('  2. git commit -m "fix: Correct onNodeInit signature in ALL drivers"');
  console.log('  3. git push origin master');
}

process.exit(errors > 0 ? 1 : 0);
