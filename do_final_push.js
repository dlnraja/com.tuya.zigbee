#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

console.log('🚀 Final push...\n');

try {
  // Git add
  console.log('📝 Git add...');
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });

  // Git commit
  console.log('💾 Git commit...');
  try {
    execSync('git commit -m "feat: Battery monitoring system + Final validation + Scripts converted to Node.js"', { 
      cwd: ROOT, 
      stdio: 'inherit' 
    });
  } catch (err) {
    console.log('Nothing to commit');
  }

  // Git push
  console.log('📤 Git push...');
  execSync('git push origin master', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n✅ Push completed!');
  
  // Auto-delete
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
