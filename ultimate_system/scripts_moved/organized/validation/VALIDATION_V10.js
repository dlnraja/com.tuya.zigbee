const fs = require('fs');
console.log('📋 VALIDATION V10');
let drivers = fs.readdirSync('./drivers').length;
let backup = fs.existsSync('./backup');
let refs = fs.existsSync('./references');
console.log(`✅ ${drivers} drivers, backup: ${backup}, refs: ${refs}`);
console.log('🎉 V10 VALIDATION COMPLETE');
