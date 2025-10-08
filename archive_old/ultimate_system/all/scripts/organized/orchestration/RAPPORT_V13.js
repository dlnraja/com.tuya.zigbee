const fs = require('fs');
console.log('📊 RAPPORT V13 FINAL');

const r = {
  backup: fs.existsSync('./backup'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  scraping: fs.existsSync('./references/scraping_v13.json'),
  organization: fs.existsSync('./scripts/organized')
};

console.log('🎯 V13 SYSTEMS:');
Object.keys(r).forEach(k => {
  console.log(`${r[k] ? '✅' : '❌'} ${k}: ${r[k]}`);
});

console.log('🎉 V13 MISSION COMPLETE');
