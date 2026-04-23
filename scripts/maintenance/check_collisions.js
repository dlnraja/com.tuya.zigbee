const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const dirs = fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());
const map = new Map();

for (const d of dirs) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        const z = j.zigbee;
        if (!z || !z.manufacturerName || !z.productId) continue;
        
        // UNIQUE fingerprints for THIS driver
        const uniqueFps = new Set();
        for (const mfr of z.manufacturerName) {
            for (const pid of z.productId) {
                uniqueFps.add(`${mfr.toLowerCase()}|${pid.toLowerCase()}`);
            }
        }
        
        for (const key of uniqueFps) {
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(d);
        }
    } catch (e) {}
}

let collisions = 0;
const report = {};
for (const [k, v] of map) {
    if (v.length > 1) {
        console.log(` CROSS-DRIVER Collision: ${k} in [${v.join(', ')}]`);
        report[k] = v;
        collisions++;
    }
}

console.log(collisions ? `\nFound ${collisions} cross-driver collision groups.` : 'No cross-driver fingerprint collisions found.')      ;
fs.writeFileSync('cross_collisions.json', JSON.stringify(report, null, 2));
