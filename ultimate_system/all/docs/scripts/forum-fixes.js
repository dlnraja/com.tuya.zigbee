const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 FORUM ANALYSIS - Community Fixes Applied');

// Apply common forum fixes
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Fix 1: Add energy monitoring capabilities
const energyCapabilities = ["measure_power", "measure_current", "measure_voltage", "meter_power"];

// Fix 2: Complete manufacturer database from forums
const forumManufacturerIDs = [
    "_TZE284_aao6qtcs", "_TZE284_cjbofhxw", "_TZE284_aagrxlbd",
    "_TZ3000_mmtwjmaq", "_TZ3000_g5xawfcq", "_TZ3000_kmh5qpmb", 
    "_TZE200_cwbvmsar", "_TZE200_bjawzodf", "_TZE200_3towulqd",
    "TS011F", "TS0201", "TS0001", "TS130F", "Tuya"
];

// Apply to all drivers
let fixCount = 0;
fs.readdirSync('drivers').forEach(driver => {
    const composePath = `drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
        const config = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Apply forum fixes
        if (config.zigbee) {
            config.zigbee.manufacturerName = forumManufacturerIDs;
            config.zigbee.productId = ["TS0001", "TS011F", "TS0201", "TS130F"];
        }
        
        // Add energy capabilities for plugs
        if (driver.includes('plug') && config.capabilities) {
            energyCapabilities.forEach(cap => {
                if (!config.capabilities.includes(cap)) {
                    config.capabilities.push(cap);
                }
            });
        }
        
        fs.writeFileSync(composePath, JSON.stringify(config, null, 2));
        fixCount++;
    }
});

// Update version
app.version = '4.0.5';
app.name = { "en": "Ultimate Zigbee Hub" };
fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log(`✅ Applied forum fixes to ${fixCount} drivers`);
console.log('🚀 Version 4.0.5 - Community fixes applied');
