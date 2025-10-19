#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Quick fix: Adding README.txt\n');

try {
  execSync('git add README.txt', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "fix: Add README.txt for Homey App Store (GitHub Actions requirement)"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ README.txt added and pushed!');
  console.log('🔄 GitHub Actions will retry automatically...\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
