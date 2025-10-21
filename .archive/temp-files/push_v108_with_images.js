#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Push v2.15.108 WITH personalized images...\n');

try {
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "chore: Bump to v2.15.108 - Build with 366 personalized images included"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ v2.15.108 PUSHED!');
  console.log('\n🔄 GitHub Actions va créer Build 180+ avec images personnalisées');
  console.log('⏳ Attendre ~3 minutes puis RELEASE TO TEST');
  console.log('🎨 Les images personnalisées seront enfin visibles!\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
