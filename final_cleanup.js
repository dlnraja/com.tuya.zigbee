#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧹 Final cleanup...\n');

try {
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "chore: Move temporary JS files to scripts/tools + Protect README.txt"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ Cleanup done!');
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
