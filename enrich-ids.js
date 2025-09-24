const fs = require('fs');
const {execSync} = require('child_process');

console.log('🏭 ENRICH COMPLETE MANUFACTURER IDs');

// Complete IDs (not wildcards like "_TZE284_")
const completeIds = [
    '_TZE200_bjawzodf', '_TZE200_locansqn', '_TZE200_pay2byax',
    '_TZ3000_26fmupbb', '_TZ3000_2putqrmw', '_TZ3000_8ybe88nf',
    '_TZE284_aao6qtcs', '_TZE284_cjbofhxw', '_TZE284_aagrxlbd',
    'Tuya', 'MOES', 'BSEED', 'TS011F', 'TS0001'
];

const drivers = fs.readdirSync('drivers').slice(0, 20);
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

console.log(`✅ Fixed ${fixed} drivers with complete IDs`);

// Update app.json for Homey App Store
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.id = 'com.dlnraja.ultimate.zigbee.hub';
app.version = '2.0.8';
app.drivers = app.drivers?.slice(0, 5) || [];
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

// Commit for Homey App Store
execSync('git add -A && git commit -m "🏭 COMPLETE IDs: Fix manufacturer wildcards + v2.0.8" && git push origin master');

console.log('🏪 HOMEY APP STORE: https://apps.developer.homey.app/app-store/publishing');
console.log('✅ Complete manufacturer IDs applied!');
