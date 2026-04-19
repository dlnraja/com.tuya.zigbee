const fs = require('fs');
const path = require('path');

// Load analysis
const analysis = JSON.parse(fs.readFileSync('ts0601-analysis.json', 'utf8'));

// Get list of PURE TUYA DP drivers only
const pureTuyaDPDrivers = analysis
    .filter(a => a.category === 'PURE_TUYA_DP' && a.hasEndpoints)
    .map(a => a.driver);

console.log('Removing endpoints from ' + pureTuyaDPDrivers.length + ' PURE Tuya DP drivers:\n');

let modified = 0;
for (const driver of pureTuyaDPDrivers) {
    const file = 'drivers/' + driver + '/driver.compose.json';
    if (!fs.existsSync(file)) continue;
    
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(txt);
        
        if (d.zigbee && d.zigbee.endpoints) {
            delete d.zigbee.endpoints;
            fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
            console.log('   ' + driver);
            modified++;
        }
    } catch(e) {
        console.error('   ' + driver + ': ' + e.message);
    }
}

console.log('\n Modified ' + modified + ' drivers');
console.log(' Multi-gang ZCL drivers (switch_2gang, etc.) PRESERVED');
