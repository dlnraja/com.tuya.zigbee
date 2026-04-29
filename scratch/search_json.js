const fs = require('fs');
const path = require('path');

function walk(dir) {
    if (dir.includes('node_modules')) return [];
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            if (filePath.endsWith('.json')) results.push(filePath);
        }
    });
    return results;
}

console.log('--- Searching for "id": "contact_sensor_opened" ---');
const files = walk('.');
files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('"id": "contact_sensor_opened"')) {
            console.log(`Found in: ${file}`);
        }
    } catch (e) {}
});
console.log('--- Search complete ---');
