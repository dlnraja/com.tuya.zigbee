const fs = require('fs');
console.log('📋 VALIDATION V17 SUPREME');

const systems = {
  backup: fs.existsSync('./backup'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  organization: fs.existsSync('./scripts/organized'),
  backup_data: fs.existsSync('./references/backup_v17.json'),
  scraping_data: fs.existsSync('./references/scraping_v17.json')
};

Object.keys(systems).forEach(sys => {
  const status = systems[sys];
  console.log(`${status ? '✅' : '❌'} ${sys.toUpperCase()}: ${status}`);
});

const report = {
  version: 'V17.0.0',
  heritage: 'V10-V16 intégré',
  systems,
  status: Object.values(systems).every(s => s) ? 'SUCCESS' : 'PARTIAL'
};

fs.writeFileSync('./references/validation_v17.json', JSON.stringify(report, null, 2));
console.log(report.status === 'SUCCESS' ? '🎉 V17 SUCCESS' : '⚠️ V17 PARTIEL');
