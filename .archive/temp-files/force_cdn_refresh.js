#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 Force CDN refresh with new build...\n');

try {
  execSync('git add -A', { cwd: __dirname, stdio: 'inherit' });
  
  execSync('git commit -m "chore: Version 2.15.106 - Force CDN cache refresh for personalized driver images"', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  execSync('git push origin master', { cwd: __dirname, stdio: 'inherit' });
  
  console.log('\n✅ PUSHED - NOUVEAU BUILD DÉCLENCHÉ!');
  console.log('\n🔄 GitHub Actions va:');
  console.log('   1. Build v2.15.106');
  console.log('   2. Validate app');
  console.log('   3. Publish to Homey');
  console.log('   4. CDN va servir les NOUVELLES images personnalisées');
  console.log('\n⏳ Durée: ~2-3 minutes');
  console.log('📍 Status: https://github.com/dlnraja/com.tuya.zigbee/actions\n');
  
  fs.unlinkSync(__filename);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
