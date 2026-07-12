// Test the new production-resolver source
const path = require('path');
const { pullFromProduction } = require('C:/Users/Dell/Documents/homey/master/tools/shadow-mode/sources/production-resolver.js');

const tickets = pullFromProduction();
console.log('Tickets pulled from production-resolver:', tickets.length);
for (const t of tickets.slice(0, 8)) {
  console.log('  -', t.source, '|', t.title.slice(0, 80));
}
if (tickets.length === 0) {
  console.log('  (no tickets — expected, no CI state files have content)');
}
