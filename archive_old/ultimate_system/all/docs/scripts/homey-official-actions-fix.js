const fs = require('fs');

console.log('🔧 HOMEY OFFICIAL ACTIONS FIX');
console.log('📝 Using official Athom GitHub Actions');
console.log('🎯 https://apps.developer.homey.app/app-store/publishing\n');

// Ensure app.json is properly structured for official actions
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Ensure version follows semantic versioning for auto-increment
if (!app.version.match(/^\d+\.\d+\.\d+$/)) {
    app.version = '2.0.0';
}

// Ensure proper structure for Homey App Store
app.homeyCommunityTopicId = 26439; // Reference to forum topic
app.source = 'https://github.com/dlnraja/com.tuya.zigbee';
app.bugs = {
    url: 'https://github.com/dlnraja/com.tuya.zigbee/issues'
};

// Clean permissions for app store
app.permissions = ['homey:manager:zigbee'];

// Ensure brandColor is set
app.brandColor = '#00E5FF';

// Professional tags for app store discovery
app.tags = {
    en: ['tuya', 'zigbee', 'smart home', 'automation', 'sensors', 'switches']
};

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ App structured for official Homey Actions');
console.log('🚀 Ready for athombv/github-action-homey-app-publish');
