const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   📁 ORGANISATION & VÉRIFICATION COMPLÈTE DU PROJET   ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Structure de dossiers à créer
const docsStructure = {
  'docs': {
    'guides': [],
    'reports': [],
    'api': [],
    'workflows': []
  },
  'scripts': {
    'validation': [],
    'fixes': [],
    'generation': [],
    'analysis': []
  }
};

// Classification des fichiers
const fileClassification = {
  guides: [
    'AUTO_PUBLISH_GUIDE.md',
    'DEVELOPER_GUIDE.md',
    'DOCUMENTATION_INDEX.md',
    'GITHUB_ACTIONS_SETUP.md',
    'INSTALLATION.md',
    'PUBLICATION_GUIDE_OFFICIELLE.md',
    'QUALITY_CHECKS_GUIDE.md',
    'QUICK_START_PUBLICATION.md',
    'SCRIPTS_README.md',
    'TUYA_DATAPOINTS_GUIDE.md',
    'CONTRIBUTING.md',
    'README_CORRECTIONS.md',
    'EXPLICATION_BATTERIES.md'
  ],
  reports: [
    'COMPLETE_SESSION_SUMMARY.md',
    'DEEP_ANALYSIS_REPORT.md',
    'DOCUMENTATION_COMPLETE_RECAP.md',
    'DRIVER_ICONS_COMPLETE.md',
    'EXEMPLE_BATTERIE_CONCRET.md',
    'FINAL_AUTO_PUBLISH_SUMMARY.md',
    'FINAL_DOCUMENTATION_SUMMARY.md',
    'FINAL_QUALITY_REPORT.md',
    'FINAL_WORKFLOW_CONFIG.md',
    'FORUM_POST_V2.9.9_FIX.md',
    'IMAGES_FIX_REPORT.md',
    'PUSH_DIAGNOSTIC.md',
    'RAPPORT_CORRECTIONS_COMPLETES.md',
    'RECAP_IMPLEMENTATION_OFFICIELLE.md',
    'RESPONSE_TO_PETER.md',
    'SESSION_COMPLETE_FINALE.md',
    'SESSION_COMPLETE.md',
    'WORKFLOW_FIX_COMPLETE.md',
    'WORKFLOW_FIXES_FINAL.md',
    'WORKFLOWS_CLEANUP_COMPLETE.md',
    'WORKFLOWS_FIX_REPORT.md'
  ],
  api: [
    'REFERENCES_COMPLETE.md'
  ],
  scripts: [
    'FIX_APP_IMAGES.js'
  ]
};

// Créer la structure de dossiers
function createStructure() {
  console.log('📂 Création structure de dossiers...\n');
  
  if (!fs.existsSync('docs')) fs.mkdirSync('docs');
  if (!fs.existsSync('docs/guides')) fs.mkdirSync('docs/guides');
  if (!fs.existsSync('docs/reports')) fs.mkdirSync('docs/reports');
  if (!fs.existsSync('docs/api')) fs.mkdirSync('docs/api');
  if (!fs.existsSync('docs/workflows')) fs.mkdirSync('docs/workflows');
  
  console.log('✅ Structure créée:\n');
  console.log('   docs/');
  console.log('   ├── guides/');
  console.log('   ├── reports/');
  console.log('   ├── api/');
  console.log('   └── workflows/');
  console.log('');
}

// Organiser les fichiers
function organizeFiles() {
  console.log('📦 Organisation des fichiers...\n');
  
  let moved = 0;
  
  // Guides
  fileClassification.guides.forEach(file => {
    if (fs.existsSync(file)) {
      const dest = path.join('docs', 'guides', file);
      fs.copyFileSync(file, dest);
      moved++;
      console.log(`   ✓ ${file} → docs/guides/`);
    }
  });
  
  // Reports
  fileClassification.reports.forEach(file => {
    if (fs.existsSync(file)) {
      const dest = path.join('docs', 'reports', file);
      fs.copyFileSync(file, dest);
      moved++;
      console.log(`   ✓ ${file} → docs/reports/`);
    }
  });
  
  // API
  fileClassification.api.forEach(file => {
    if (fs.existsSync(file)) {
      const dest = path.join('docs', 'api', file);
      fs.copyFileSync(file, dest);
      moved++;
      console.log(`   ✓ ${file} → docs/api/`);
    }
  });
  
  console.log(`\n✅ ${moved} fichiers organisés\n`);
}

// Vérifications complètes
function runVerifications() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║              🔍 VÉRIFICATIONS COMPLÈTES                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const checks = {
    drivers: 0,
    images: 0,
    compose: 0,
    deviceJs: 0,
    endpoints: 0,
    manufacturerIds: 0
  };
  
  // Vérifier drivers
  const driversDir = 'drivers';
  if (fs.existsSync(driversDir)) {
    const drivers = fs.readdirSync(driversDir).filter(d => 
      fs.statSync(path.join(driversDir, d)).isDirectory()
    );
    
    checks.drivers = drivers.length;
    
    drivers.forEach(driver => {
      const driverPath = path.join(driversDir, driver);
      
      // Vérifier driver.compose.json
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        checks.compose++;
        
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          
          // Vérifier endpoints
          if (compose.zigbee && compose.zigbee.endpoints) {
            checks.endpoints++;
          }
          
          // Vérifier manufacturerName
          if (compose.zigbee && compose.zigbee.manufacturerName) {
            checks.manufacturerIds++;
          }
        } catch (e) {
          // Ignorer erreurs JSON
        }
      }
      
      // Vérifier device.js
      if (fs.existsSync(path.join(driverPath, 'device.js'))) {
        checks.deviceJs++;
      }
      
      // Vérifier images
      const assetsPath = path.join(driverPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const hasSmall = fs.existsSync(path.join(assetsPath, 'small.png'));
        const hasLarge = fs.existsSync(path.join(assetsPath, 'large.png'));
        const hasXlarge = fs.existsSync(path.join(assetsPath, 'xlarge.png'));
        
        if (hasSmall && hasLarge && hasXlarge) {
          checks.images++;
        }
      }
    });
  }
  
  // Afficher résultats
  console.log('📊 RÉSULTATS VÉRIFICATIONS:\n');
  console.log(`   Drivers total:          ${checks.drivers}`);
  console.log(`   driver.compose.json:    ${checks.compose}/${checks.drivers} (${Math.round(checks.compose/checks.drivers*100)}%)`);
  console.log(`   device.js:              ${checks.deviceJs}/${checks.drivers} (${Math.round(checks.deviceJs/checks.drivers*100)}%)`);
  console.log(`   Images complètes:       ${checks.images}/${checks.drivers} (${Math.round(checks.images/checks.drivers*100)}%)`);
  console.log(`   Endpoints définis:      ${checks.endpoints}/${checks.drivers} (${Math.round(checks.endpoints/checks.drivers*100)}%)`);
  console.log(`   ManufacturerIDs:        ${checks.manufacturerIds}/${checks.drivers} (${Math.round(checks.manufacturerIds/checks.drivers*100)}%)`);
  console.log('');
  
  // Vérifier app.json
  try {
    if (fs.existsSync('app.json')) {
      const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      console.log('📦 APP.JSON:\n');
      console.log(`   Version:                ${app.version}`);
      console.log(`   SDK:                    ${app.sdk}`);
      console.log(`   ID:                     ${app.id}`);
      console.log(`   Compatibility:          ${app.compatibility}`);
      console.log('');
    }
  } catch (e) {
    console.log('⚠️  Erreur lecture app.json\n');
  }
  
  // Vérifier changelog
  try {
    if (fs.existsSync('.homeychangelog.json')) {
      const changelog = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
      const versions = Object.keys(changelog);
      console.log('📋 CHANGELOG:\n');
      console.log(`   Versions documentées:   ${versions.length}`);
      console.log(`   Dernière version:       ${versions[0]}`);
      console.log('');
    }
  } catch (e) {
    console.log('⚠️  Erreur lecture changelog\n');
  }
  
  return checks;
}

// Créer index de documentation
function createDocIndex() {
  console.log('📚 Création index documentation...\n');
  
  const index = `# 📚 DOCUMENTATION INDEX - UNIVERSAL TUYA ZIGBEE

**Version:** 2.10.2  
**Date:** ${new Date().toLocaleDateString('fr-FR')}

---

## 📖 GUIDES

### Démarrage
- [README](../README.md) - Guide principal
- [Installation](guides/INSTALLATION.md) - Installation et configuration
- [Quick Start](guides/QUICK_START_PUBLICATION.md) - Démarrage rapide

### Développement
- [Developer Guide](guides/DEVELOPER_GUIDE.md) - Guide développeur complet
- [Contributing](guides/CONTRIBUTING.md) - Contribution au projet
- [Scripts](guides/SCRIPTS_README.md) - Documentation scripts

### Publication
- [Publication Guide](guides/PUBLICATION_GUIDE_OFFICIELLE.md) - Guide officiel
- [Auto-Publish](guides/AUTO_PUBLISH_GUIDE.md) - Publication automatique
- [GitHub Actions](guides/GITHUB_ACTIONS_SETUP.md) - Configuration CI/CD
- [Quality Checks](guides/QUALITY_CHECKS_GUIDE.md) - Vérifications qualité

### Spécifique Tuya
- [Tuya Datapoints](guides/TUYA_DATAPOINTS_GUIDE.md) - Guide datapoints
- [Batteries](guides/EXPLICATION_BATTERIES.md) - Gestion batteries
- [Exemples](reports/EXEMPLE_BATTERIE_CONCRET.md) - Exemples concrets

---

## 📊 RAPPORTS

### Session Marathon
- [Session Complete](reports/SESSION_COMPLETE.md) - Récapitulatif final
- [Final Quality](reports/FINAL_QUALITY_REPORT.md) - Rapport qualité
- [Complete Summary](reports/COMPLETE_SESSION_SUMMARY.md) - Résumé complet

### Corrections
- [Deep Analysis](reports/DEEP_ANALYSIS_REPORT.md) - Analyse profonde
- [Corrections](reports/RAPPORT_CORRECTIONS_COMPLETES.md) - Corrections appliquées
- [Driver Icons](reports/DRIVER_ICONS_COMPLETE.md) - Icônes drivers
- [Images Fix](reports/IMAGES_FIX_REPORT.md) - Correctifs images

### Workflows
- [Workflow Config](reports/FINAL_WORKFLOW_CONFIG.md) - Configuration finale
- [Workflow Fixes](reports/WORKFLOW_FIXES_FINAL.md) - Correctifs workflow
- [Cleanup](reports/WORKFLOWS_CLEANUP_COMPLETE.md) - Nettoyage

### Communication
- [Response to Peter](reports/RESPONSE_TO_PETER.md) - Email utilisateur
- [Forum Post](reports/FORUM_POST_V2.9.9_FIX.md) - Post communauté

---

## 🔧 API & RÉFÉRENCES

- [References Complete](api/REFERENCES_COMPLETE.md) - Toutes références

---

## 📝 CHANGELOG

Voir [CHANGELOG.md](../CHANGELOG.md) et [.homeychangelog.json](../.homeychangelog.json)

---

**Généré automatiquement par ORGANIZE_AND_VERIFY.js**
`;
  
  fs.writeFileSync('docs/INDEX.md', index);
  console.log('✅ Index créé: docs/INDEX.md\n');
}

// Exécution
try {
  createStructure();
  organizeFiles();
  const checks = runVerifications();
  createDocIndex();
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║            ✅ ORGANISATION TERMINÉE                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('📊 RÉSUMÉ:\n');
  console.log(`   ✓ Structure créée`);
  console.log(`   ✓ Fichiers organisés`);
  console.log(`   ✓ Vérifications complètes`);
  console.log(`   ✓ Index documentation`);
  console.log(`   ✓ ${checks.drivers} drivers vérifiés\n`);
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
}
