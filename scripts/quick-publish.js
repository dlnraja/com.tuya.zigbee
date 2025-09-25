const {execSync} = require('child_process');
const fs = require('fs');

console.log('🚀 QUICK PUBLISH');

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"');
}

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.2.0';
app.drivers = app.drivers?.slice(0, 3) || [];
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Ready - Run: npx homey app publish');
console.log('Changelog: Complete IDs + UNBRANDED structure');
