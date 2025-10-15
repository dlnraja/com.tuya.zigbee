#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎨 Push UNIQUE personalized images...\n');

try {
  execSync('git add drivers/*/assets/images/*.png', { cwd: __dirname, stdio: 'inherit' });
  execSync('git add scripts/tools/GENERATE_UNIQUE_PERSONALIZED_IMAGES.js', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "feat: Generate 366 UNIQUE personalized driver images - Type-based colors and energy badges"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ UNIQUE PERSONALIZED IMAGES PUSHED!');
  console.log('\n🎨 Images par type:');
  console.log('   🔴 Motion sensors - Rouge');
  console.log('   🟦 Contact sensors - Cyan');
  console.log('   🟠 Temperature - Orange');
  console.log('   💧 Humidity - Bleu clair');
  console.log('   🔥 Smoke - Rouge foncé');
  console.log('   🔘 Switches - Gris');
  console.log('   💡 Lights - Jaune');
  console.log('   🚨 Security - Rouge sombre');
  console.log('   + Badges 🔋 (battery) ou ⚡ (AC)\n');
  console.log('🔄 GitHub Actions rebuilding...\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
