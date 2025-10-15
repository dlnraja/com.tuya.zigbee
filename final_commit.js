#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('📝 Final commit...\n');
  
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });
  
  try {
    execSync('git commit -m "docs: Complete JS organization report + 297 files organized"', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('Nothing to commit');
  }
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ Done!');
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
