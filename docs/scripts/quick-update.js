const fs = require('fs');
const { execSync } = require('child_process');

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '4.0.4';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

console.log('✅ Updated to v4.0.4 - Ready for publish');
