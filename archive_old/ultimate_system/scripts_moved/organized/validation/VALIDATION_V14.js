const fs = require('fs');
console.log('📋 VALIDATION FINALE V14');

const systems = {
  backup: fs.existsSync('./backup'),
  references: fs.existsSync('./references'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  organization: fs.existsSync('./scripts/organized'),
  scraping_data: fs.existsSync('./references/scraping_v14.json'),
  historical_data: fs.existsSync('./references/historical_v14.json')
};

console.log('🎯 SYSTÈMES V14:');
Object.keys(systems).forEach(sys => {
  const status = systems[sys];
  const icon = status ? '✅' : '❌';
  console.log(`${icon} ${sys.toUpperCase()}: ${status}`);
});

// Rapport détaillé
const report = {
  version: 'V14.0.0',
  timestamp: new Date().toISOString(),
  systems,
  totalDrivers: systems.drivers,
  inspirationSource: 'Tous les anciens push V10-V13',
  status: Object.values(systems).every(s => s) ? 'SUCCESS' : 'PARTIAL'
};

fs.writeFileSync('./references/validation_v14.json', JSON.stringify(report, null, 2));

if (report.status === 'SUCCESS') {
  console.log('🎉 === VALIDATION V14 TERMINÉE ===');
} else {
  console.log('⚠️ === VALIDATION V14 PARTIELLE ===');
}
