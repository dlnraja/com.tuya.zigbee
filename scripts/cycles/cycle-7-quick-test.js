// CYCLE 7/10: VALIDATION RAPIDE
const fs = require('fs');

console.log('🔄 CYCLE 7/10: VALIDATION');

// Test structure
const drivers = fs.readdirSync('drivers');
let valid = 0;
drivers.forEach(d => {
    if (fs.existsSync(`drivers/${d}/driver.compose.json`) && 
        fs.existsSync(`drivers/${d}/device.js`)) valid++;
});

console.log(`✅ ${valid}/${drivers.length} drivers OK`);
console.log('🎉 CYCLE 7/10 TERMINÉ');
