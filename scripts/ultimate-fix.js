const fs = require('fs');
const { execSync } = require('child_process');

// Complete IDs - NO wildcards
const mIds = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb",
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_3towulqd",
    "TS011F", "TS0201", "TS0001", "TS0011", "TS130F", "TS0601",
    "Tuya", "MOES", "BSEED"
];

const pIds = ["TS0001", "TS0011", "TS0201", "TS011F", "TS130F", "TS0601"];

// Enrich ALL drivers
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = mIds;
            c.zigbee.productId = pIds;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
        }
    }
});

// Update app
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '4.0.0';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean & push
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

execSync('git pull && git add -A && git commit -m "🏭 Ultimate fix v4.0.0" && git push --force');
console.log('✅ MEGA ENRICHMENT COMPLETE - v4.0.0');
