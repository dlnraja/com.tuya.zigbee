const fs = require('fs');
const { execSync } = require('child_process');

const mIds = ["_TZE284_aao6qtcs", "_TZ3000_mmtwjmaq", "TS011F", "Tuya"];
const pIds = ["TS0001", "TS011F", "TS0201"];

// Fix app
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '3.0.0';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Enrich drivers
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

// Clean & push
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}
execSync('git pull && git add -A && git commit -m "Fix v3.0.0" && git push --force');
console.log('✅ Done');
