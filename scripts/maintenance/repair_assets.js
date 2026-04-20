const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

const MASTER_ICON = 'C:/Users/HP/.gemini/antigravity/brain/de506b05-c873-4931-a5e9-7faee24c65ea/tuya_master_icon_500_1775927533687.png';

if (!fs.existsSync(MASTER_ICON)) {
    console.error(`Master icon not found: ${MASTER_ICON}`);
    process.exit(1);
}

console.log(`Starting bulk asset repair for ${drivers.length} drivers...`);

let repaired = 0;

for (const driver of drivers) {
    const assetsDir = path.join(driversDir, driver, 'assets', 'images');
    if (!fs.existsSync(assetsDir)) continue;

    const largePng = path.join(assetsDir, 'large.png');
    
    // Audit current dimension
    let needsRepair = false;
    if (fs.existsSync(largePng)) {
        try {
            const buf = Buffer.alloc(24);
            const fd = fs.openSync(largePng, 'r');
            fs.readSync(fd, buf, 0, 24, 0);
            fs.closeSync(fd);
            const width = buf.readUInt32BE(16);
            const height = buf.readUInt32BE(20);
            if (width !== 500 || height !== 500) needsRepair = true;
        } catch (e) { needsRepair = true; }
    } else {
        needsRepair = true;
    }

    if (needsRepair) {
        fs.copyFileSync(MASTER_ICON, largePng);
        console.log(`[REPAIRED] ${driver}: 500x500 master icon applied`);
        repaired++;
    }
}

console.log(`\nRepair complete. ${repaired} assets updated.`);
