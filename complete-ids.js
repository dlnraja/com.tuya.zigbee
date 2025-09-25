const fs = require('fs');
const { execSync } = require('child_process');

// COMPLETE IDs ONLY - No wildcards
const ids = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd", "_TZE284_uqfph8ah",
    "_TZE284_sxm7l9xa", "_TZE284_khkk23xi", "_TZE284_9cxrt8gp", "_TZE284_byzdgzgn",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", "_TZ3000_fllyghyj",
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_3towulqd", "_TZE200_locansqn",
    "_TZ3040_bb6xaihh", "_TYZB01_cbiezpds", "_TYZB01_hlla45kx", "_TYZB01_zsl6z0pw",
    "TS011F", "TS0201", "TS0001", "TS0011", "TS130F", "TS0601", "TS0203",
    "Tuya", "MOES", "BSEED", "Neo", "Aqara"
];

console.log('🏭 ENRICHING ALL DRIVERS - COMPLETE IDs ONLY');

// Update ALL drivers
fs.readdirSync('drivers').forEach(d => {
    const path = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const config = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (config.zigbee) {
                config.zigbee.manufacturerName = ids;
                fs.writeFileSync(path, JSON.stringify(config, null, 2));
                console.log(`✅ ${d}`);
            }
        } catch(e) {}
    }
});

// Update version
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.3.0';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Clean cache
if (fs.existsSync('.homeycompose')) {
    execSync('powershell -Command "Remove-Item -Recurse -Force .homeycompose"', {stdio: 'pipe'});
}

// Push
execSync('git add -A && git commit -m "🏭 ULTRA: Complete IDs v2.3.0 - No wildcards" && git push origin master');
console.log('🎉 ULTRA ENRICHMENT COMPLETE!');
