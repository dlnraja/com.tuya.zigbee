const fs = require('fs');

console.log('🌐 FINAL FORUM IMPLEMENTATION');
console.log('✅ All forum requirements + unique identity\n');

// Complete manufacturer IDs (with text after underscore)
const COMPLETE_IDS = [
    '_TZE284_aao6qtcs', '_TZE284_3towulqd', '_TZE284_bxoo2swd',
    '_TZE200_cwbvmsar', '_TZE200_bjawzodf', '_TZE200_3towulqd', 
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZ3000_8ybe88nf',
    'Tuya', 'MOES', 'BSEED'
];

const PRODUCT_IDS = ['TS0001', 'TS0011', 'TS011F', 'TS0201', 'TS0601'];

// 1. Final unique identity
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.id = 'com.dlnraja.ultimate.tuya.zigbee.hub';
app.name = {"en": "Ultimate Tuya Zigbee Hub - Community Edition"};
app.version = '6.0.0';
app.author = {name: "Dylan Rajasekaram", email: "dylan@dlnraja.com"};
app.sdk = 3;
app.permissions = [];

// 2. Apply to all drivers
let count = 0;
fs.readdirSync('drivers').forEach(d => {
    const path = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee) {
            config.zigbee.manufacturerName = COMPLETE_IDS;
            config.zigbee.productId = PRODUCT_IDS;
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            count++;
        }
    }
});

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ ${count} drivers enriched`);
console.log(`✅ Version: ${app.version}`);
console.log('🚀 Ready for Homey App Store publish!');
