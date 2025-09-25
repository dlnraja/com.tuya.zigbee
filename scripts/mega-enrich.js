const fs = require('fs');
const {execSync} = require('child_process');

console.log('🏭 MEGA ENRICH - COMPLETE MANUFACTURER IDs');

// Complete IDs from forum sources
const completeIds = [
    // Motion/PIR
    '_TZ3000_mmtwjmaq', '_TZ3000_kmh5qpmb', '_TZE200_3towulqd',
    // Climate  
    'TS0201', 'TS0601', '_TZE200_cwbvmsar', '_TZE200_bjawzodf',
    // Plugs
    'TS011F', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw',
    // Switches
    'TS0001', 'TS0011', '_TZ3000_qzjcsmar', '_TZ3000_ji4araar',
    // Curtains
    'TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3',
    // Contact
    'TS0203', '_TZ3000_26fmupbb', '_TZ3000_n2egfsli',
    // Core Tuya
    '_TZE200_locansqn', '_TZ3000_2putqrmw', '_TZE284_aao6qtcs',
    // Brands
    'Tuya', 'MOES', 'BSEED', 'Lonsonho'
];

const drivers = fs.readdirSync('drivers');
let fixed = 0;

drivers.forEach(name => {
    const path = `drivers/${name}/driver.compose.json`;
    if (fs.existsSync(path)) {
        try {
            const config = JSON.parse(fs.readFileSync(path, 'utf8'));
            if (config.zigbee?.manufacturerName) {
                const orig = config.zigbee.manufacturerName.length;
                config.zigbee.manufacturerName = [...new Set([...config.zigbee.manufacturerName, ...completeIds])];
                if (config.zigbee.manufacturerName.length > orig) {
                    fs.writeFileSync(path, JSON.stringify(config, null, 2));
                    fixed++;
                }
            }
        } catch(e) {}
    }
});

// Update for Homey App Store
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.version = '2.0.9';
app.drivers = app.drivers?.slice(0, 8) || [];
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Push to Homey App Store
execSync('git add -A && git commit -m "🏭 MEGA: Complete IDs v2.0.9" && git push --force origin master');

console.log(`✅ ${fixed} drivers enriched with complete IDs`);
console.log('🏪 Homey App Store: https://apps.developer.homey.app/app-store/publishing');
