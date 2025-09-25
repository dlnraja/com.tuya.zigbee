const fs = require('fs');

console.log('🔒 FIXING VERSION TO 2.0.0');
console.log('⚠️  NO MORE INCREMENTING until Homey Dashboard shows 2.0.0');
console.log('📋 Current test version on Homey: 1.0.30\n');

// Fix app version to exactly 2.0.0
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// FORCE VERSION TO 2.0.0 - NO INCREMENTING
app.version = '2.0.0';

// Keep unique identity
app.id = 'com.dlnraja.ultimate.tuya.zigbee.hub';
app.name = {
    "en": "Ultimate Tuya Zigbee Hub - Community Edition"
};

// SDK3 compliance maintained
app.sdk = 3;
app.permissions = [];

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ Version FIXED to: ${app.version}`);
console.log('🔒 NO MORE VERSION INCREMENTS');
console.log('⏳ Waiting for Homey Dashboard to show 2.0.0');
