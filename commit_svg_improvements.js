#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎨 Commit SVG improvements...\n');

try {
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "fix: Create professional SVG images without text overlap + Investigation report"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git pull --rebase origin master', { cwd: __dirname, stdio: 'inherit' });
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ SVG improvements pushed!');
  console.log('\n📝 PROCHAINE ÉTAPE:');
  console.log('   1. Convertir les SVG en PNG (svgtopng.com ou Inkscape)');
  console.log('   2. Remplacer large.png, small.png, xlarge.png');
  console.log('   3. Commit les nouveaux PNG\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
