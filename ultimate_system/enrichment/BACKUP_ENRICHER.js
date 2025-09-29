const fs = require('fs');

console.log('🔧 BACKUP ENRICHER');

let found = 0;
if (fs.existsSync('./backup')) {
  found = fs.readdirSync('./backup').length;
}

console.log(`✅ ${found} backups`);
