const fs = require('fs');
const path = require('path');

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
let removedCount = 0;

for (const file of files) {
    try {
        let txt = fs.readFileSync(file, 'utf8');
        let d = JSON.parse(txt);
        if (d.zigbee && d.zigbee.endpoints) {
            delete d.zigbee.endpoints;
            fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
            console.log('Removed endpoints from', file);
            removedCount++;
        }
    } catch(e) {
        // console.error(file, e.message);
    }
}
console.log('Total files fixed:', removedCount);
