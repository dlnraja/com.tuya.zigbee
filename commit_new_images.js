#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎨 Commit new professional images...\n');

try {
  execSync('git add assets/images/*.png', { cwd: __dirname, stdio: 'inherit' });
  execSync('git add reports/FIX_APP_IMAGES_REPORT.json', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "fix: Professional app images with clean design - no text overlap"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ New images pushed!');
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
