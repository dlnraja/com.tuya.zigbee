const fs = require('fs');
const path = require('path');

const driversDir = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(driversDir).filter(f => fs.statSync(path.join(driversDir, f)).isDirectory());

console.log(`Checking ${drivers.length} drivers for asset compliance...`);

let issues = 0;
const invalidDrivers = [];

for (const driver of drivers) {
    const largePng = path.join(driversDir, driver, 'assets', 'images', 'large.png');
    if (!fs.existsSync(largePng)) {
        // console.log(`[MISSING] ${driver}: large.png not found`);
        continue;
    }

    try {
        const buf = Buffer.alloc(24);
        const fd = fs.openSync(largePng, 'r');
        fs.readSync(fd, buf, 0, 24, 0);
        fs.closeSync(fd);

        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);

        if (width !== 500 || height !== 500) {
            console.log(`[INVALID] ${driver}: ${width}x${height}`);
            invalidDrivers.push({ driver, width, height, path: largePng });
            issues++;
        }
    } catch (err) {
        console.error(`[ERROR] ${driver}: ${err.message}`);
    }
}

console.log(`\nFound ${issues} drivers with non-500x500 large.png`);
fs.writeFileSync('invalid_assets.json', JSON.stringify(invalidDrivers, null, 2));
