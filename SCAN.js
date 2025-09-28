const fs = require('fs');

console.log('🔍 SCAN BACKUP');
const data = {};

fs.readdirSync('./backup').forEach(d => {
  if (fs.existsSync(`./backup/${d}/drivers`)) {
    data[d] = fs.readdirSync(`./backup/${d}/drivers`).length;
  }
});

fs.writeFileSync('./backup_data.json', JSON.stringify(data));
console.log('✅ Scan terminé');
