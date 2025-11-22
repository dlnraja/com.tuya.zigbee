const fs = require('fs');

console.log('🔧 ENRICHER');

let found = 0;
if (fs.existsSync('./backup')) {
  fs.readdirSync('./backup').forEach(backup => {
    if (fs.existsSync(`./backup/${backup}/version_info.json`)) {
      found++;
    }
  });
}

console.log(`✅ ${found} versions analysées`);
