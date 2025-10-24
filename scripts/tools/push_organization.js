#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Push organization...\n');

try {
  console.log('📝 Git add...');
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });

  console.log('💾 Git commit...');
  try {
    execSync('git commit -m "feat: Complete JS files organization - 193 files organized in 9 categories"', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (err) {
    console.log('Nothing to commit');
  }

  console.log('📤 Git push...');
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });

  console.log('\n✅ Push completed!');
  
  // Auto-delete
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
