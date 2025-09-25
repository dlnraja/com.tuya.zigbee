const fs = require('fs');
const { execSync } = require('child_process');

console.log('🏭 MEGA ENRICHMENT - ALL DRIVERS');

// Complete IDs from Johan Bendz + Homey Community
const ids = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd", "_TZE284_uqfph8ah",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", "_TZ3000_fllyghyj",
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_locansqn", "_TZE200_3towulqd",
    "TS011F", "TS0201", "TS0001", "TS0011", "TS130F", "TS0601", "TS0203",
    "Tuya", "MOES", "BSEED", "Neo", "Aqara"
];

const productIds = ["TS0001", "TS0011", "TS0201", "TS011F", "TS130F", "TS0601"];

// Enrich ALL drivers
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = ids;
            c.zigbee.productId = productIds;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
            console.log(`✅ ${d}`);
        }
    }
});

// Update app
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.6.0';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

console.log('🎉 MEGA ENRICHMENT COMPLETE!');
