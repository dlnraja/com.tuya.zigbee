const fs = require('fs');
const { execSync } = require('child_process');

// Complete IDs only - NO wildcards 
const ids = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZ3000_mmtwjmaq", 
    "TS011F", "TS0201", "Tuya", "MOES"
];

// Fix app.json
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.name = { "en": "Ultimate Zigbee Hub" };
app.version = '2.7.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Enrich drivers
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.manufacturerName = ids;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
        }
    }
});

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

// Push to trigger GitHub Actions
execSync('git add -A && git commit -m "🚀 Quick fix publish v2.7.0" && git push origin master');
console.log('✅ DONE - GitHub Actions triggered');
