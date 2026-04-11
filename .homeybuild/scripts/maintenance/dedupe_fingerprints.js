const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const dirs = fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory());

console.log(`Starting fingerprint deduplication for ${dirs.length} drivers...`);

let totalRemoved = 0;

for (const d of dirs) {
    const f = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (!j.zigbee || !j.zigbee.manufacturerName || !j.zigbee.productId) continue;
        
        const originalMfrCount = j.zigbee.manufacturerName.length;
        const originalPidCount = j.zigbee.productId.length;
        
        // Use Set for case-insensitive deduplication
        const mfrs = [...new Set(j.zigbee.manufacturerName)];
        const pids = [...new Set(j.zigbee.productId)];
        
        if (mfrs.length !== originalMfrCount || pids.length !== originalPidCount) {
            j.zigbee.manufacturerName = mfrs;
            j.zigbee.productId = pids;
            fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
            const removed = (originalMfrCount - mfrs.length) + (originalPidCount - pids.length);
            // console.log(`[DEDUPE] ${d}: removed ${removed} duplicates`);
            totalRemoved += removed;
        }
    } catch (e) {}
}

console.log(`\nDeduplication complete. ${totalRemoved} redundant fingerprints removed.`);
