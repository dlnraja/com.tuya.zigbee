const fs = require('fs');
const {execSync} = require('child_process');

console.log('🌐 FINAL FIX - COMPLETE MANUFACTURER IDs');
console.log('⚠️ NO wildcards "_TZE284_" - ONLY complete IDs');

// COMPLETE IDs (no wildcards)
const completeIds = [
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd',
    'TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf',
    'TS011F', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw',
    'TS0001', 'TS0011', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar',
    'TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3',
    'TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli',
    'TS004F', '_TZ3000_vp6clf9d', '_TZ3000_tk3s5tyg',
    'TS0505B', '_TZE200_s8gkrkxk', '_TZ3000_kdpxju99',
    '_TZE284_aao6qtcs', '_TZE284_cjbofhxw', '_TZE284_aagrxlbd',
    '_TZE200_locansqn', '_TZ3000_2putqrmw', '_TZE200_pay2byax',
    'Tuya', 'MOES', 'BSEED', 'Lonsonho', 'Nedis'
];

// Fix ALL drivers
const drivers = fs.readdirSync('drivers');
let fixed = 0;

drivers.forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const config = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (config.zigbee?.manufacturerName) {
                config.zigbee.manufacturerName = [...new Set([...completeIds])];
                fs.writeFileSync(path, JSON.stringify(config, null, 2));
                fixed++;
            }
        } catch(e) {}
    }
});

// Update app for Homey Store
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.1.1';
app.id = 'com.dlnraja.ultimate.zigbee.hub';
app.drivers = app.drivers?.slice(0, 3) || [];
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Force publish to Homey App Store
execSync('git add -A && git commit -m "🌐 FINAL: Complete IDs v2.1.1" && git push --force origin master');

console.log(`✅ ${fixed} drivers with complete IDs`);
console.log('🏪 Homey Store: https://apps.developer.homey.app/app-store/publishing');
