const fs = require('fs');

console.log('🏪 HOMEY APP STORE 2.0.0 - QUICK FIX');

// 1. Reset app.json to professional 2.0.0
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.0.0';
app.id = 'com.tuya.zigbee';
app.name = { "en": "Tuya Zigbee" };
app.description = { "en": "Professional Tuya Zigbee device support" };
app.category = ['climate', 'lights', 'security'];
app.author = { name: 'Community' };
app.settings = [{
    type: 'group',
    label: { en: 'Settings' },
    children: [{
        id: 'debug_logging',
        type: 'checkbox',
        label: { en: 'Debug logging' },
        value: false
    }]
}];
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// 2. Clean manufacturer IDs
const cleanIDs = [
    "_TZE284_aao6qtcs", "_TZ3000_mmtwjmaq", "_TZE200_cwbvmsar",
    "Tuya", "MOES", "TS0001", "TS0011", "TS011F", "TS0201"
];

// Fix all drivers
fs.readdirSync('drivers').forEach(d => {
    const path = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee) {
            config.zigbee.manufacturerName = cleanIDs;
            config.zigbee.productId = ["TS0001", "TS0011", "TS011F", "TS0201"];
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
        }
    }
});

console.log('✅ Version 2.0.0 ready for Homey App Store');
