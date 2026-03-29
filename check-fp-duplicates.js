const fs = require('fs');
const path = require('path');

// Find all driver.compose.json files
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
const fpMap = new Map(); // mfr+pid -> [drivers]

for (const file of files) {
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(txt);
        const driver = path.basename(path.dirname(file));
        
        if (!d.zigbee) continue;
        
        const mfrs = d.zigbee.manufacturerName || [];
        const pids = d.zigbee.productId || [];
        
        // Check for shared fingerprints
        for (const mfr of mfrs) {
            for (const pid of pids) {
                const key = mfr + '::' + pid;
                if (!fpMap.has(key)) {
                    fpMap.set(key, []);
                }
                fpMap.get(key).push(driver);
            }
        }
    } catch(e) {
        // Skip
    }
}

// Find duplicates
let duplicates = [];
for (const [fp, drivers] of fpMap.entries()) {
    if (drivers.length > 1) {
        duplicates.push({fp, drivers: [...new Set(drivers)]});
    }
}

console.log('CRITICAL: Fingerprints shared across multiple drivers:', duplicates.length);
if (duplicates.length > 0) {
    console.log('\nTop 20 examples:');
    duplicates.slice(0, 20).forEach(d => {
        console.log('  ' + d.fp + ' -> ' + d.drivers.join(', '));
    });
}
