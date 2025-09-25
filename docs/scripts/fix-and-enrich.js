const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 ULTRA FIX + ENRICH SYSTEM');

// Complete IDs - NO wildcards
const mIds = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb",
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_3towulqd",
    "TS011F", "TS0201", "TS0001", "TS130F", "Tuya", "MOES"
];

const pIds = ["TS0001", "TS0011", "TS0201", "TS011F", "TS130F", "TS0601"];

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.name = { "en": "Ultimate Zigbee Hub" };
app.version = '2.8.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Enrich ALL drivers
let count = 0;
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = mIds;
            c.zigbee.productId = pIds;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
            count++;
        }
    }
});

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

// Push
execSync('git add -A && git commit -m "🔧 Ultra fix + enrich v2.8.0" && git push origin master');
console.log(`✅ Fixed + enriched ${count} drivers - GitHub Actions triggered`);
