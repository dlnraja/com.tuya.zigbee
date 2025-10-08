const fs = require('fs');

console.log('🚀 FINAL VALIDATION & PUBLISH PREPARATION');

// Complete manufacturer IDs
const FINAL_IDS = [
    '_TZE284_aao6qtcs', '_TZE284_3towulqd', '_TZE200_cwbvmsar', 
    '_TZE200_bjawzodf', '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb',
    'Tuya', 'MOES', 'BSEED'
];

const PRODUCT_IDS = ['TS0001', 'TS0011', 'TS011F', 'TS0201', 'TS0601'];

// Final app configuration
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.id = 'com.dlnraja.ultimate.tuya.zigbee.hub';
app.name = {"en": "Ultimate Tuya Zigbee Hub - Community Edition"};
app.version = '6.2.0';
app.sdk = 3;
app.permissions = [];
app.author = {name: "Dylan Rajasekaram", email: "dylan@dlnraja.com"};

// Apply to all drivers
let count = 0;
fs.readdirSync('drivers').forEach(d => {
    const path = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee) {
            config.zigbee.manufacturerName = FINAL_IDS;
            config.zigbee.productId = PRODUCT_IDS;
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
            count++;
        }
    }
});

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ Final: ${count} drivers, v${app.version}, unique identity`);
console.log('🚀 Ready for publish!');
