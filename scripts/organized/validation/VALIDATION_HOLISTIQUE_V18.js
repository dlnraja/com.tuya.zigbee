const fs = require('fs');
console.log('📋 VALIDATION HOLISTIQUE V18');

const systems = {
  backup: fs.existsSync('./backup'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  organization: fs.existsSync('./scripts/organized'),
  backup_data: fs.existsSync('./references/backup_ultimate_v18.json'),
  scraping_data: fs.existsSync('./references/scraping_holistique_v18.json'),
  enrichment_data: fs.existsSync('./references/enrichment_v18.json')
};

Object.keys(systems).forEach(sys => {
  console.log(`${systems[sys] ? '✅' : '❌'} ${sys.toUpperCase()}: ${systems[sys]}`);
});

const report = {
  version: 'V18.0.0',
  heritage: 'V10-V16 intégré',
  systems,
  status: Object.values(systems).every(s => s) ? 'SUCCESS' : 'PARTIAL'
};

fs.writeFileSync('./references/validation_v18.json', JSON.stringify(report, null, 2));
console.log(report.status === 'SUCCESS' ? '🎉 V18 HOLISTIQUE SUCCESS' : '⚠️ V18 PARTIEL');
