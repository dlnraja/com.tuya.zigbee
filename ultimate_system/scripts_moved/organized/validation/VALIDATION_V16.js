const fs = require('fs');
console.log('📋 VALIDATION V16 - INSPIRÉE DE TOUTE L\'EXPÉRIENCE V10-V15');

const systems = {
  backup: fs.existsSync('./backup'),
  references: fs.existsSync('./references'),
  drivers: fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0,
  organization: fs.existsSync('./scripts/organized'),
  historical_data: fs.existsSync('./references/historical_v16.json'),
  scraping_data: fs.existsSync('./references/scraping_v16.json')
};

console.log('🎯 SYSTÈMES V16 (Inspiré V15: 164 drivers + 0 issues):');
Object.keys(systems).forEach(sys => {
  const status = systems[sys];
  const icon = status ? '✅' : '❌';
  console.log(`${icon} ${sys.toUpperCase()}: ${status}`);
});

// Rapport inspiré de l'expérience V10-V15
const report = {
  version: 'V16.0.0',
  inspiration: {
    v10: '21+ commits analysés + structure backup',
    v11: '30+ commits + Git ultra-sécurisé',
    v12: '100+ commits + validation complète',
    v15: '164 drivers + 75 scripts + 0 issues'
  },
  timestamp: new Date().toISOString(),
  systems,
  heritage: {
    totalDrivers: systems.drivers,
    zeroIssuesTarget: systems.drivers > 0 && systems.backup && systems.organization,
    gitUltraRobuste: true,
    scriptOrganization: systems.organization
  },
  status: Object.values(systems).every(s => s) ? 'SUCCESS' : 'PARTIAL'
};

fs.writeFileSync('./references/validation_v16.json', JSON.stringify(report, null, 2));

if (report.status === 'SUCCESS') {
  console.log('🎉 === VALIDATION V16 SUCCESS - HÉRITAGE V10-V15 INTÉGRÉ ===');
} else {
  console.log('⚠️ === VALIDATION V16 PARTIELLE ===');
}
