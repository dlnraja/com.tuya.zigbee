const fs = require('fs');

console.log('🔍 QUICK FINAL CHECK');

// Final app config
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '7.0.0';
app.id = 'com.dlnraja.ultimate.tuya.zigbee.hub';
app.name = {"en": "Ultimate Tuya Zigbee Hub - Community Edition"};
app.sdk = 3;
app.permissions = [];

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ Final version: ${app.version}`);
console.log('🚀 Ready for force push!');
