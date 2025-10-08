const fs = require('fs');

console.log('🎯 ENRICHING PRODUCT IDs');

const pIds = ["TS0001", "TS0011", "TS0201", "TS011F", "TS130F", "TS0601", "TS0203", "TS004F"];

let count = 0;
fs.readdirSync('drivers').forEach(d => {
    const p = `drivers/${d}/driver.compose.json`;
    if (fs.existsSync(p)) {
        const c = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (c.zigbee) {
            c.zigbee.productId = pIds;
            fs.writeFileSync(p, JSON.stringify(c, null, 2));
            count++;
        }
    }
});

console.log(`✅ ${count} drivers enriched with product IDs`);
