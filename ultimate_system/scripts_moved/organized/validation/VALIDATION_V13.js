const fs = require('fs');
console.log('📋 VALIDATION V13');

const v = {
  backup: fs.existsSync('./backup'),
  references: fs.existsSync('./references'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  scraping: fs.existsSync('./references/scraping_v13.json')
};

console.log('📊 V13 RESULTS:');
Object.keys(v).forEach(k => {
  console.log(`${v[k] ? '✅' : '❌'} ${k}: ${v[k]}`);
});

console.log('🎉 V13 VALIDATION COMPLETE');
