const fs = require('fs');
console.log('--- Scanning app.json for exact ID ---');
const content = fs.readFileSync('app.json', 'utf8');
const regex = /"id":\s*"contact_sensor_opened"/g;
let count = 0;
let match;
while ((match = regex.exec(content)) !== null) {
    count++;
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + 100);
    console.log(`Match ${count} at ${match.index}:\n${content.substring(start, end).trim()}`);
}
console.log(`Total exact matches: ${count}`);
console.log('--- Scanning complete ---');
