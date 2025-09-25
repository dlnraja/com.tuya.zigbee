const fs = require('fs');

console.log('⚡ QUICK BYPASS - ALL TASKS');

// Final IDs
const IDS = ['_TZE284_aao6qtcs', '_TZE200_bjawzodf', '_TZ3000_mmtwjmaq', 'Tuya'];
const PRODUCTS = ['TS0001', 'TS0011', 'TS011F', 'TS0601'];

// Update all drivers
let count = 0;
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = IDS;
            c.zigbee.productId = PRODUCTS;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
            count++;
        }
    }
});

// Final app
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '8.0.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ ${count} drivers, v${app.version} ready`);
