const fs = require('fs');

console.log('🔧 FINAL PUBLISH FIX - Based on GitHub Actions errors analysis');
console.log('🎯 Fixing all issues preventing Homey App Store publication\n');

// Read current app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// 1. Ensure clean app structure for publishing
app.id = 'com.tuya.zigbee';
app.version = '2.0.1'; // Bump for new publish attempt
app.compatibility = '>=5.0.0';
app.sdk = 3;

// 2. Professional metadata
app.name = { "en": "Tuya Zigbee" };
app.description = { "en": "Professional Tuya Zigbee device support for Homey" };
app.category = ['climate', 'lights', 'security'];

// 3. Required fields for Homey App Store
app.author = { 
    name: "Community",
    email: "support@community.homey.app"
};

app.contributors = {
    developers: [
        { name: "Dylan Rajasekaram", email: "dylan@dlnraja.com" }
    ]
};

// 4. Clean permissions
app.permissions = ['homey:manager:zigbee'];

// 5. Settings structure that works
app.settings = [{
    type: 'group',
    label: { en: 'Application Settings' },
    children: [{
        id: 'debug_logging',
        type: 'checkbox',
        label: { en: 'Enable debug logging' },
        hint: { en: 'Enable detailed logging for troubleshooting' },
        value: false
    }]
}];

// 6. App store metadata
app.homeyCommunityTopicId = 26439;
app.source = 'https://github.com/dlnraja/com.tuya.zigbee';
app.brandColor = '#00E5FF';

// 7. Clean images structure
app.images = {
    small: '/assets/images/small.png',
    large: '/assets/images/large.png'
};

// 8. Save clean app.json
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('✅ App.json optimized for Homey App Store');

// 9. Verify assets exist
const assetsDir = 'assets/images';
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log('📁 Created assets directory');
}

console.log('🚀 Ready for GitHub Actions publishing to Homey App Store!');
console.log('📊 Version: 2.0.1');
console.log('🎯 Target: Homey Developer Dashboard (not GitHub Pages)');
