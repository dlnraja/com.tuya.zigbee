const fs = require('fs');
const path = require('path');

const APP_JSON = path.join(__dirname, '../../app.json');

console.log('🔧 Fixing app.json discovery field...\n');

// Read app.json
const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

// Remove discovery (not needed for Zigbee apps, handled by homey-zigbeedriver)
if (app.discovery) {
  delete app.discovery;
  console.log('✅ Removed invalid discovery field');
}

// Verify other fields
console.log('✅ BrandColor:', app.brandColor);
console.log('✅ Notifications:', Object.keys(app.notifications || {}).length, 'templates');

// Save
fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2), 'utf8');

console.log('\n✅ app.json fixed!');
