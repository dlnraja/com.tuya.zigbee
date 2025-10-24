#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎨 Commit all driver images fixes...\n');

try {
  console.log('📝 Git add all drivers...');
  execSync('git add drivers/', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('📝 Git add assets/images...');
  execSync('git add assets/images/', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('📝 Git add reports...');
  execSync('git add reports/', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('📝 Git add scripts...');
  execSync('git add scripts/', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n💾 Git commit...');
  execSync('git commit -m "fix: Correct all driver icon paths + Generate 366 missing images for 183 drivers"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  console.log('\n🔄 Git pull --rebase...');
  execSync('git pull --rebase origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n📤 Git push...');
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ All done!');
  console.log('\n📊 RÉSUMÉ:');
  console.log('   - 183 drivers fixés');
  console.log('   - 366 images générées');
  console.log('   - Chemins corrigés: ./assets/ → ./assets/images/');
  console.log('   - GitHub Actions va rebuilder automatiquement\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
}
