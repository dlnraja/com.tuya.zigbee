const fs = require('fs');
const path = require('path');

// Find all drivers that use TS0601 (Tuya DP protocol)
function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walkDir(file));
            }
        } else {
            if (file.endsWith('driver.compose.json')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir('drivers');
const ts0601Drivers = [];

for (const file of files) {
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(txt);
        const driver = path.basename(path.dirname(file));
        
        if (!d.zigbee) continue;
        
        const pids = d.zigbee.productId || [];
        
        // Check if this driver handles TS0601
        if (pids.includes('TS0601')) {
            ts0601Drivers.push({
                driver,
                hasEndpoints: d.zigbee.endpoints ? true : false,
                endpointCount: d.zigbee.endpoints ? Object.keys(d.zigbee.endpoints ).length : 0
            });
        }
    } catch(e) {
        // Skip
    }
}

console.log('TS0601 Tuya DP Protocol Drivers:', ts0601Drivers.length);
console.log('\nDrivers WITH endpoints:');
ts0601Drivers.filter(d => d.hasEndpoints).forEach(d => {
    console.log('  ' + d.driver + ' (endpoints: ' + d.endpointCount + ')');
});

console.log('\nDrivers WITHOUT endpoints:');
ts0601Drivers.filter(d => !d.hasEndpoints).forEach(d => {
    console.log('  ' + d.driver);
});
