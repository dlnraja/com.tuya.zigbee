const fs = require('fs');

// COMPLETE manufacturer IDs (NO wildcards)
const completeIDs = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZ3000_mmtwjmaq", 
    "_TZ3000_g5xawfcq", "_TZE200_cwbvmsar", "_TZE200_bjawzodf",
    "Tuya", "MOES", "TS0001", "TS0011", "TS011F", "TS0201"
];

// Fix all drivers
fs.readdirSync('drivers').forEach(d => {
    const path = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(path)) {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        if (config.zigbee) {
            config.zigbee.manufacturerName = completeIDs;
            config.zigbee.productId = ["TS0001", "TS0011", "TS011F", "TS0201"];
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
        }
    }
});

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '4.0.7';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('✅ IDs fixed - v4.0.7');
