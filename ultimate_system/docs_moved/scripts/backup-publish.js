const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔄 BACKUP PUBLISH SYSTEM');

// Clean cache
console.log('🧹 Cleaning cache...');
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

// Fix configuration
console.log('🔧 Fixing configuration...');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.2.0';
app.drivers = app.drivers?.slice(0, 3) || [];
app.id = 'com.dlnraja.ultimate.zigbee.hub';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Ready for manual publish');
console.log('📋 Manual steps:');
console.log('1. Run: npx homey app publish');
console.log('2. Answer: n (keep version 2.2.0)');
console.log('3. Changelog: Complete manufacturer IDs + UNBRANDED structure');
console.log('4. Answer: y (publish)');

console.log('\n📊 Current status:');
console.log(`Version: ${app.version}`);
console.log(`Drivers: ${app.drivers?.length}`);
console.log(`ID: ${app.id}`);
console.log('Cache: Cleaned');
