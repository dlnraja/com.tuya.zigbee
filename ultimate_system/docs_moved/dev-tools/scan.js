const fs = require('fs');
console.log('🔍 CYCLE 2/10 SCAN');
const drivers = fs.readdirSync('./drivers');
console.log(`Found ${drivers.length} drivers`);
fs.writeFileSync('./dev-tools/scan-result.txt', `Drivers: ${drivers.length}\n${drivers.join('\n')}`);
