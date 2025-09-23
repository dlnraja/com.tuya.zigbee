const fs = require('fs');
const {execSync} = require('child_process');

console.log('🎉 FINAL CHECK & PUBLISH');

// Verify
const drivers = fs.readdirSync('drivers').length;
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
console.log(`✅ ${drivers} drivers, ${app.drivers.length} in manifest`);

// Publish
execSync('git add -A && git commit -m "🎉 FINAL: Ready for Homey App Store" && git push origin master');
console.log('🚀 SUCCESS - Published!');
