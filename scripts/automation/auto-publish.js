const { spawn } = require('child_process');

console.log('🚀 AUTO-PUBLISH TO HOMEY APP STORE\n');

// Commit first
const { execSync } = require('child_process');
try {
  console.log('📦 Committing changes...');
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git commit -m "fix: Critical device.js restoration - Ready for publish"', { stdio: 'inherit' });
  console.log('✅ Changes committed\n');
} catch (err) {
  console.log('⚠️ No changes to commit or already committed\n');
}

console.log('📤 Starting Homey publish...');
console.log('⚠️ MANUAL INTERVENTION REQUIRED:');
console.log('Please run the following command MANUALLY:');
console.log('');
console.log('  homey app publish');
console.log('');
console.log('Then respond to the prompts:');
console.log('  1. Uncommitted changes? → Y (Yes)');
console.log('  2. Update version? → Y (Yes)');
console.log('  3. Select version: → Patch (default)');
console.log('  4. Changelog: → "Critical fixes for device capabilities"');
console.log('');
console.log('OR wait for next GitHub Actions build which will auto-publish.');
console.log('');
console.log('Current version: 2.15.117');
console.log('Next version will be: 2.15.118');
console.log('');
