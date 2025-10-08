const fs = require('fs');
console.log('📋 FINAL VALIDATION V12');

const validation = {
  backup: fs.existsSync('./backup'),
  references: fs.existsSync('./references'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  organization: fs.existsSync('./scripts/organized'),
  historicalData: fs.existsSync('./references/historical_database_v12.json'),
  webScraping: fs.existsSync('./references/web_scraping_v12.json')
};

console.log('📊 === VALIDATION V12 RESULTS ===');
Object.keys(validation).forEach(key => {
  const status = validation[key] ? '✅' : '❌';
  console.log(`${status} ${key.toUpperCase()}: ${validation[key]}`);
});

if (!fs.existsSync('./references')) fs.mkdirSync('./references');
fs.writeFileSync('./references/final_validation_v12.json', JSON.stringify(validation, null, 2));

console.log('🎉 === VALIDATION V12 COMPLETE ===');
