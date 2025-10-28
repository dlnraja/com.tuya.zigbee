#!/usr/bin/env node
'use strict';

/**
 * FIX_SUPER_CALLS_PATTERN.js
 * 
 * Corrige le pattern exact trouvé:
 * ❌ await super.onNodeInit().catch(err => this.error(err));
 * ✅ await super.onNodeInit({ zclNode }).catch(err => this.error(err));
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let totalFiles = 0;
let fixedFiles = 0;
let errors = 0;

console.log('🔧 Fixing super.onNodeInit() CALLS (specific pattern)...\n');

/**
 * Fix super.onNodeInit() calls
 */
function fixSuperCalls(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: super.onNodeInit().catch
    content = content.replace(
      /super\.onNodeInit\(\)\.catch/g,
      'super.onNodeInit({ zclNode }).catch'
    );
    
    // Pattern 2: await super.onNodeInit();
    content = content.replace(
      /await\s+super\.onNodeInit\(\s*\);/g,
      'await super.onNodeInit({ zclNode });'
    );
    
    // Pattern 3: super.onNodeInit();  (sans await)
    content = content.replace(
      /(\s+)super\.onNodeInit\(\s*\);/g,
      '$1await super.onNodeInit({ zclNode });'
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
  fixSuperCalls(file);
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
  console.log('  2. git commit -m "fix(CRITICAL): Pass zclNode to super.onNodeInit in ALL drivers"');
  console.log('  3. git push origin master');
  console.log('  4. Verify: node tools/test_onNodeInit.js');
}

process.exit(errors > 0 ? 1 : 0);
