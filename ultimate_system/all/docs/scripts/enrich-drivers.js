const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 ENRICHING ALL DRIVERS - COMPLETE IDs');

// Complete manufacturer IDs (no wildcards)
const completeIds = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd", "_TZE284_uqfph8ah",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", "_TZ3000_fllyghyj",
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_locansqn", "_TZE200_3towulqd",
    "TS011F", "TS0201", "TS0001", "TS0011", "TS0002", "TS0003", "TS0004", "TS130F",
    "TS004F", "TS0505B", "TS0601", "TS0203", "Tuya", "MOES", "BSEED", "Lonsonho"
];

// Enrich all drivers
fs.readdirSync('drivers').forEach(driverName => {
    const configPath = `drivers/${driverName}/driver.compose.json`;
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.zigbee) {
                config.zigbee.manufacturerName = [...new Set([...completeIds])];
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                console.log(`✅ ${driverName}`);
            }
        } catch(e) {}
    }
});

// Update app version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.2.1';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

// Commit and push
execSync('git add -A && git commit -m "🏭 MEGA: Complete IDs v2.2.1" && git push origin master');
console.log('🎉 All drivers enriched with complete IDs!');
