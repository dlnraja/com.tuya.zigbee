const fs = require('fs');
console.log('📋 VALIDATION FINALE V15 - SYSTÈME HOLISTIQUE');

const validationReport = {
  version: 'V15.0.0',
  timestamp: new Date().toISOString(),
  systemStatus: 'INITIALIZING',
  components: {},
  statistics: {},
  recommendations: []
};

// Validation des composants essentiels
const components = [
  {key: 'backup', path: './backup', type: 'directory'},
  {key: 'references', path: './references', type: 'directory'},
  {key: 'drivers', path: './drivers', type: 'directory'},
  {key: 'organization', path: './scripts/organized', type: 'directory'},
  {key: 'ultra_scan_data', path: './references/ultra_scan_v15.json', type: 'file'},
  {key: 'orchestrator_log', path: './references/orchestrator_v15_log.json', type: 'file'}
];

components.forEach(comp => {
  if (comp.type === 'directory') {
    validationReport.components[comp.key] = {
      exists: fs.existsSync(comp.path),
      itemCount: fs.existsSync(comp.path) ? fs.readdirSync(comp.path).length : 0
    };
  } else {
    validationReport.components[comp.key] = {
      exists: fs.existsSync(comp.path),
      size: fs.existsSync(comp.path) ? fs.statSync(comp.path).size : 0
    };
  }
});

// Statistiques détaillées
if (validationReport.components.drivers.exists) {
  validationReport.statistics.totalDrivers = validationReport.components.drivers.itemCount;
  
  let validDrivers = 0;
  let enrichedDrivers = 0;
  
  fs.readdirSync('./drivers').slice(0, 20).forEach(driver => { // Limité pour performance
    const composePath = `./drivers/${driver}/driver.compose.json`;
    if (fs.existsSync(composePath)) {
      validDrivers++;
      try {
        const compose = JSON.parse(fs.readFileSync(composePath));
        if (compose.id && compose.id.startsWith('_TZ')) {
          enrichedDrivers++;
        }
      } catch(e) {}
    }
  });
  
  validationReport.statistics.validDrivers = validDrivers;
  validationReport.statistics.enrichedDrivers = enrichedDrivers;
  validationReport.statistics.enrichmentRate = `${Math.round((enrichedDrivers/validDrivers)*100)}%`;
}

// Évaluation du statut global
const criticalComponents = ['backup', 'drivers', 'references'];
const allCriticalOK = criticalComponents.every(comp => validationReport.components[comp].exists);

if (allCriticalOK && validationReport.statistics.enrichedDrivers > 0) {
  validationReport.systemStatus = 'SUCCESS';
} else if (allCriticalOK) {
  validationReport.systemStatus = 'PARTIAL';
} else {
  validationReport.systemStatus = 'FAILURE';
}

// Recommandations intelligentes
if (validationReport.statistics.enrichmentRate < '80%') {
  validationReport.recommendations.push('Exécuter ULTRA_ENRICHER_V15 pour améliorer enrichissement');
}

if (!validationReport.components.organization.exists) {
  validationReport.recommendations.push('Exécuter ORGANIZE_ALL_V15 pour structurer les scripts');
}

// Affichage des résultats
console.log('🎯 COMPOSANTS V15:');
Object.keys(validationReport.components).forEach(comp => {
  const data = validationReport.components[comp];
  const icon = data.exists ? '✅' : '❌';
  console.log(`${icon} ${comp.toUpperCase()}: ${data.exists ? 'OK' : 'MISSING'}`);
});

if (validationReport.statistics.totalDrivers) {
  console.log(`\n📊 STATISTIQUES:`);
  console.log(`• Drivers totaux: ${validationReport.statistics.totalDrivers}`);
  console.log(`• Drivers enrichis: ${validationReport.statistics.enrichedDrivers}`);
  console.log(`• Taux enrichissement: ${validationReport.statistics.enrichmentRate}`);
}

// Sauvegarde du rapport
fs.writeFileSync('./references/validation_v15.json', JSON.stringify(validationReport, null, 2));

const statusIcons = {SUCCESS: '🎉', PARTIAL: '⚠️', FAILURE: '❌'};
console.log(`${statusIcons[validationReport.systemStatus]} === VALIDATION V15 ${validationReport.systemStatus} ===`);
