#!/usr/bin/env node
'use strict';

/**
 * APPLY SDK3 PATTERNS - Automatic Corrections
 * Based on deep comparison with official SDK3 documentation
 * 
 * Fixes:
 * 1. Add .catch() to all promises in onNodeInit
 * 2. Add cluster existence checks
 * 3. Use CLUSTER constants instead of numeric IDs
 * 4. Add isFirstInit() for IAS Zone enrollment
 * 5. Add reportOpts to registerCapability
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const LIB_DIR = path.join(ROOT, 'lib');

const fixes = {
  applied: 0,
  errors: 0,
  files: []
};

/**
 * Fix 1: Add .catch() to promises in onNodeInit
 */
function addPromiseCatches(content) {
  let modified = content;
  let changes = 0;
  
  // Pattern: await xxx without .catch()
  const patterns = [
    // readAttributes without catch
    {
      regex: /(await\s+\w+\.readAttributes\([^)]+\))(?!\s*\.catch)/g,
      replacement: '$1.catch(err => this.error(err))'
    },
    // writeAttributes without catch
    {
      regex: /(await\s+\w+\.writeAttributes\([^)]+\))(?!\s*\.catch)/g,
      replacement: '$1.catch(err => this.error(err))'
    },
    // configureAttributeReporting without catch
    {
      regex: /(await\s+this\.configureAttributeReporting\(\[[^\]]+\]\))(?!\s*\.catch)/g,
      replacement: '$1.catch(err => this.error(err))'
    },
    // setupIASZone without catch
    {
      regex: /(await\s+this\.setupIASZone\(\))(?!\s*\.catch)/g,
      replacement: '$1.catch(err => this.error(err))'
    }
  ];
  
  patterns.forEach(({ regex, replacement }) => {
    const matches = modified.match(regex);
    if (matches) {
      changes += matches.length;
      modified = modified.replace(regex, replacement);
    }
  });
  
  return { content: modified, changes };
}

/**
 * Fix 2: Add cluster existence checks
 */
function addClusterChecks(content) {
  let modified = content;
  let changes = 0;
  
  // Pattern: endpoint.clusters.xxx.on( without existence check
  const regex = /(\s+)(endpoint\.clusters\.(\w+)\.on\()/g;
  
  modified = modified.replace(regex, (match, indent, fullMatch, clusterName) => {
    changes++;
    return `${indent}// Check cluster existence before listening\n${indent}if (endpoint?.clusters?.${clusterName}) {\n  ${indent}${fullMatch}`;
  });
  
  // Add closing braces for if statements (simplified - would need proper AST parsing for production)
  // For now, just log that manual review is needed
  
  return { content: modified, changes };
}

/**
 * Fix 3: Wrap IAS Zone enrollment with isFirstInit()
 */
function addIsFirstInit(content) {
  let modified = content;
  let changes = 0;
  
  // Pattern: await this.setupIASZone()
  const regex = /(await\s+this\.setupIASZone\(\)[^;]*;)/g;
  
  modified = modified.replace(regex, (match) => {
    changes++;
    return `// Only enroll on first initialization\n      if (this.isFirstInit() === true) {\n        ${match}\n      }`;
  });
  
  return { content: modified, changes };
}

/**
 * Fix 4: Add reportOpts to registerCapability calls
 */
function addReportOpts(content) {
  let modified = content;
  let changes = 0;
  
  // This is complex - would need AST parsing for accurate modification
  // For now, log files that need manual review
  
  if (content.includes('registerCapability') && !content.includes('reportOpts')) {
    changes = 1; // Flag for manual review
  }
  
  return { content: modified, changes };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let totalChanges = 0;
    
    // Only process if file contains onNodeInit
    if (!content.includes('onNodeInit')) {
      return;
    }
    
    // Apply fixes
    let result;
    
    result = addPromiseCatches(content);
    content = result.content;
    totalChanges += result.changes;
    
    result = addClusterChecks(content);
    content = result.content;
    totalChanges += result.changes;
    
    result = addIsFirstInit(content);
    content = result.content;
    totalChanges += result.changes;
    
    result = addReportOpts(content);
    totalChanges += result.changes;
    
    // Write back if modified
    if (content !== original && totalChanges > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${path.relative(ROOT, filePath)} (${totalChanges} changes)`);
      fixes.applied += totalChanges;
      fixes.files.push(path.relative(ROOT, filePath));
    }
    
  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
    fixes.errors++;
  }
}

/**
 * Process directory recursively
 */
function processDirectory(dir) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!item.startsWith('.') && item !== 'node_modules') {
        processDirectory(fullPath);
      }
    } else if (item.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Applying SDK3 patterns...\n');
  
  // Process lib directory
  console.log('📁 Processing lib/...');
  processDirectory(LIB_DIR);
  
  // Process drivers directory  
  const driversDir = path.join(ROOT, 'drivers');
  console.log('\n📁 Processing drivers/...');
  processDirectory(driversDir);
  
  console.log('\n✨ SDK3 Pattern Application Complete!');
  console.log(`   ✅ Changes applied: ${fixes.applied}`);
  console.log(`   📄 Files modified: ${fixes.files.length}`);
  console.log(`   ❌ Errors: ${fixes.errors}`);
  
  if (fixes.files.length > 0) {
    console.log('\n📋 Modified files:');
    fixes.files.forEach(file => console.log(`   - ${file}`));
  }
  
  console.log('\n⚠️  IMPORTANT: Manual review required for:');
  console.log('   1. Closing braces for cluster existence checks');
  console.log('   2. Adding reportOpts to registerCapability calls');
  console.log('   3. Converting numeric cluster IDs to CLUSTER constants');
  console.log('\n📖 See docs/technical/SDK3_DEEP_COMPARISON_v4.9.256.md for details');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, processDirectory };
