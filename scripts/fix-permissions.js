const fs = require('fs');

console.log('🔧 FIXING PERMISSIONS ERROR');
console.log('📝 Removing invalid permission: homey:manager:zigbee\n');

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Remove invalid permission - Zigbee apps don't need explicit permissions
app.permissions = [];

// Bump version for new attempt
const parts = app.version.split('.');
parts[2] = String(parseInt(parts[2] || 0) + 1);
app.version = parts.join('.');

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ Invalid permissions removed');
console.log(`📊 Version: ${app.version}`);
console.log('🎯 Ready for Homey App Store validation!');
