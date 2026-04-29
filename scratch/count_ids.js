const fs = require('fs');
const content = fs.readFileSync('app.json', 'utf8');
const ids = content.match(/"id":\s*"[^"]+"/g);
const counts = {};
ids.forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
});

console.log('--- Duplicate IDs found in app.json (containing "contact") ---');
Object.keys(counts).forEach(id => {
    if (counts[id] > 1 && id.toLowerCase().includes('contact')) {
        console.log(`${id}: ${counts[id]}`);
    }
});
console.log('--- Scanned ' + ids.length + ' IDs ---');
