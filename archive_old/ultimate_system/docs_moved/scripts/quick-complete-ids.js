const fs = require('fs');
const {execSync} = require('child_process');

console.log('🌐 QUICK COMPLETE IDs FIX');

// Complete IDs only (no wildcards)
const ids = [
    '_TZE284_aao6qtcs', '_TZE284_cjbofhxw', '_TZE284_aagrxlbd', '_TZE284_uqfph8ah',
    '_TZ3000_mmtwjmaq', '_TZ3000_g5xawfcq', '_TZE200_bjawzodf', '_TZE200_locansqn',
    'TS011F', 'TS0201', 'TS0001', 'TS130F', 'TS004F', 'TS0505B',
    'Tuya', 'MOES', 'BSEED'
];

// Fix all drivers
fs.readdirSync('drivers').forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const config = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (config.zigbee?.manufacturerName) {
                config.zigbee.manufacturerName = [...new Set(ids)];
                fs.writeFileSync(path, JSON.stringify(config, null, 2));
            }
        } catch(e) {}
    }
});

// Update for Homey Store
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.1.2';
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Publish
execSync('git add -A && git commit -m "🌐 COMPLETE IDs v2.1.2" && git push origin master');
console.log('✅ Complete IDs applied + published');
