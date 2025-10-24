#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 CHECKING FOR DOUBLE SUFFIXES IN FILES AND FOLDERS\n');

const patterns = [
  /_(\w+)_\1/,  // _word_word
  /_other_other/,
  /_backup_backup/,
  /_copy_copy/,
  /_new_new/,
  /_old_old/,
  /_tmp_tmp/,
  /_temp_temp/
];

function checkPath(dirPath, results = []) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    // Skip certain directories
    if (item === 'node_modules' || item === '.git' || item === '.homeybuild') continue;
    
    // Check item name for double suffixes
    for (const pattern of patterns) {
      if (pattern.test(item)) {
        results.push({
          path: fullPath,
          name: item,
          type: stat.isDirectory() ? 'directory' : 'file',
          issue: 'Double suffix detected'
        });
        break;
      }
    }
    
    // Recursively check directories
    if (stat.isDirectory()) {
      checkPath(fullPath, results);
    }
  }
  
  return results;
}

const rootDir = path.join(__dirname, '..', '..');
const issues = checkPath(rootDir);

if (issues.length > 0) {
  console.log(`❌ Found ${issues.length} files/folders with double suffixes:\n`);
  
  for (const issue of issues) {
    console.log(`  ${issue.type === 'directory' ? '📁' : '📄'} ${issue.name}`);
    console.log(`     Path: ${path.relative(rootDir, issue.path)}`);
    console.log(`     Issue: ${issue.issue}\n`);
  }
  
  process.exit(1);
} else {
  console.log('✅ No double suffixes found!\n');
  process.exit(0);
}
