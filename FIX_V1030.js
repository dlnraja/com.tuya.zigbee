const fs = require('fs');
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Format v1.0.30
app.name = { en: "Ultimate Zigbee Hub", fr: "Hub Zigbee Ultime", de: "Ultimate Zigbee Hub", nl: "Ultimate Zigbee Hub" };
app.category = "lights"; // STRING pas array
app.brandColor = "#1E88E5";
app.description.en = "Ultimate Zigbee Hub v2.1.9 - Enhanced compatibility with 1000+ devices from 60+ manufacturers. Professional SDK3 architecture with comprehensive Johan Bendz compatibility. Local Zigbee 3.0 operation.";
app.homeyCommunityTopicId = 140352;
app.platforms = ["local"];

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));
console.log('✅ Format v1.0.30 appliqué');
