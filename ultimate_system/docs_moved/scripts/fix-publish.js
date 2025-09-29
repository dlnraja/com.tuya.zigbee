const {execSync} = require('child_process');
const fs = require('fs');

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"');
}

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.2.0';
app.drivers = app.drivers?.slice(0, 3);
app.id = 'com.dlnraja.ultimate.zigbee.hub';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Fixed - Run: npx homey app publish');
console.log('Responses: n, "Complete IDs + UNBRANDED", y');
