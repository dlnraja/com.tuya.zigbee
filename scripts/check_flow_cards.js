const fs = require('fs');
const t = JSON.parse(fs.readFileSync('flow/triggers.json', 'utf8'));
const c = JSON.parse(fs.readFileSync('flow/conditions.json', 'utf8'));
const a = JSON.parse(fs.readFileSync('flow/actions.json', 'utf8'));
console.log('Triggers:', Object.keys(t).length);
console.log('Conditions:', Object.keys(c).length);
console.log('Actions:', Object.keys(a).length);
console.log('TOTAL:', Object.keys(t).length + Object.keys(c).length + Object.keys(a).length);
