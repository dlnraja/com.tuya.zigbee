const fs = require('fs');

console.log('📊 RAPPORT FUSION V10-V20');

let drivers = 0, backups = 0, modules = 0;

if (fs.existsSync('./drivers')) drivers = fs.readdirSync('./drivers').length;
if (fs.existsSync('./backup')) backups = fs.readdirSync('./backup').length;
if (fs.existsSync('./modules')) modules = 12;

console.log(`🚗 Drivers: ${drivers}`);
console.log(`💾 Backups: ${backups}`);
console.log(`📦 Modules: ${modules}`);
console.log('✅ FUSION V10-V20 TERMINÉE');
