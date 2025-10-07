#!/usr/bin/env node
/**
 * ORGANIZE FILES - Organisation complète des scripts et fichiers
 */

const fs = require('fs');
const path = require('path');

const rootPath = __dirname;

console.log('📁 ORGANIZE FILES - Organisation Fichiers et Scripts');
console.log('='.repeat(80));
console.log('');

// Structure de dossiers
const folders = {
  'scripts/analysis': 'Scripts d\'analyse et audit',
  'scripts/fixes': 'Scripts de corrections',
  'scripts/images': 'Scripts images',
  'scripts/forum': 'Scripts forum et community',
  'scripts/publishing': 'Scripts publication',
  'scripts/enrichment': 'Scripts enrichissement',
  'reports': 'Rapports et analyses',
  'archive': 'Scripts obsolètes'
};

// Créer structure
Object.keys(folders).forEach(folder => {
  const folderPath = path.join(rootPath, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`   ✅ Créé: ${folder}`);
  }
});

console.log('');

// Mapping fichiers → dossiers
const fileMapping = {
  // ANALYSIS
  'scripts/analysis': [
    'MASTER_ORCHESTRATOR_ULTIMATE.js',
    'MEGA_ORCHESTRATOR_ULTIMATE.js',
    'DEEP_AUDIT_SYSTEM.js',
    'MASTER_AUDIT_AND_FIX.js'
  ],
  
  // FIXES
  'scripts/fixes': [
    'FIX_ALL_CASCADE_ERRORS.js',
    'CLEAN_PRODUCTIDS_INTELLIGENT.js',
    'AUTO_FIX_AND_PUBLISH.js'
  ],
  
  // IMAGES
  'scripts/images': [
    'FIX_IMAGES_CORRECT_DIMENSIONS.js',
    'FIX_DRIVER_IMAGE_PATHS.js',
    'GENERATE_VALID_PNGS.js',
    'FIX_ALL_DRIVER_IMAGES.js',
    'FIX_APP_IMAGES_DIMENSIONS.js',
    'FIX_ALL_IMAGES_FINAL.js',
    'FIX_IMAGES_FINAL.js',
    'FIX_APP_JSON_IMAGES.js'
  ],
  
  // FORUM
  'scripts/forum': [
    'FORUM_SCRAPER_ULTIMATE.js',
    'FIX_FORUM_TEMP_HUMIDITY_SENSOR.js'
  ],
  
  // PUBLISHING
  'scripts/publishing': [
    'ULTIMATE_FIX_AND_PUBLISH.js',
    'FINAL_PUBLISH_MEGA.js',
    'AUTO_PUBLISH_ULTIMATE.js',
    'AUTO_PUBLISH_10X.js'
  ],
  
  // ENRICHMENT
  'scripts/enrichment': [
    'ULTIMATE_ENRICHMENT_SYSTEM.js'
  ],
  
  // REPORTS
  'reports': [
    'RAPPORT_FINAL_COMPLET.md',
    'RAPPORT_FINAL_SESSION.md',
    'RAPPORT_MEGA_SESSION_FINALE.md',
    'SESSION_COMPLETE_FINALE.md',
    'RAPPORT_FINAL_ITERATIONS.md',
    'FIX_PATH_SPACE_ISSUE.md',
    'AUDIT_REPORT.json',
    'DEEP_AUDIT_REPORT.json',
    'ENRICHMENT_TODO.json',
    'REORGANIZATION_PLAN.json',
    'ORCHESTRATOR_RESULTS.json',
    'cascade_errors_report.json',
    'COMMIT_MESSAGE.txt'
  ],
  
  // ARCHIVE (scripts obsolètes)
  'archive': [
    'PUBLISH_FIX_PATH.ps1',
    'PUBLISH_DIRECT.ps1',
    'PUBLISH_V132.ps1'
  ]
};

// Déplacer fichiers
let moved = 0;
let errors = 0;

Object.entries(fileMapping).forEach(([targetFolder, files]) => {
  files.forEach(file => {
    const sourcePath = path.join(rootPath, file);
    const targetPath = path.join(rootPath, targetFolder, file);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.renameSync(sourcePath, targetPath);
        console.log(`   ✅ ${file} → ${targetFolder}/`);
        moved++;
      } catch (error) {
        console.log(`   ❌ Erreur ${file}: ${error.message}`);
        errors++;
      }
    }
  });
});

console.log('');

// Garder à la racine (importants)
const keepAtRoot = [
  'PUBLISH_NOW.ps1',
  'ORGANIZE_FILES.js',
  'package.json',
  'README.md',
  'app.json',
  '.gitignore',
  '.github'
];

console.log('📋 Fichiers gardés à la racine:');
keepAtRoot.forEach(f => {
  if (fs.existsSync(path.join(rootPath, f))) {
    console.log(`   ✅ ${f}`);
  }
});

console.log('');

// Créer INDEX.md
const indexContent = `# 📁 ORGANISATION FICHIERS - Universal Tuya Zigbee v1.4.0

## 📂 Structure des Dossiers

### \`scripts/analysis/\`
Scripts d'analyse et audit complet de l'app
- \`MEGA_ORCHESTRATOR_ULTIMATE.js\` - Analyse 15 phases complète
- \`MASTER_ORCHESTRATOR_ULTIMATE.js\` - Orchestration 10 phases
- \`DEEP_AUDIT_SYSTEM.js\` - Audit profond 163 drivers
- \`MASTER_AUDIT_AND_FIX.js\` - Audit basique

### \`scripts/fixes/\`
Scripts de corrections automatiques
- \`FIX_ALL_CASCADE_ERRORS.js\` ⭐ Auto-correction complète
- \`CLEAN_PRODUCTIDS_INTELLIGENT.js\` ⭐ Nettoyage productIds (1,014 supprimés)
- \`AUTO_FIX_AND_PUBLISH.js\` - Fix et publication auto

### \`scripts/images/\`
Scripts corrections images Homey SDK3
- \`FIX_IMAGES_CORRECT_DIMENSIONS.js\` ⭐ Solution finale dimensions
- \`FIX_DRIVER_IMAGE_PATHS.js\` ⭐ Correction chemins app.json
- \`GENERATE_VALID_PNGS.js\` - Génération PNG avec sharp
- Autres scripts images (tentatives multiples)

### \`scripts/forum/\`
Scripts analyse forum Homey Community
- \`FORUM_SCRAPER_ULTIMATE.js\` ⭐ NLP + OCR patterns
- \`FIX_FORUM_TEMP_HUMIDITY_SENSOR.js\` - Fix post #228

### \`scripts/publishing/\`
Scripts publication Homey App Store
- \`ULTIMATE_FIX_AND_PUBLISH.js\` - Fix + validation + publish
- \`FINAL_PUBLISH_MEGA.js\` - Publication finale v1.4.0
- \`AUTO_PUBLISH_ULTIMATE.js\` - Publication automatique
- \`AUTO_PUBLISH_10X.js\` - 10 iterations auto

### \`scripts/enrichment/\`
Scripts enrichissement données
- \`ULTIMATE_ENRICHMENT_SYSTEM.js\` - Scraping zigbee-herdsman

### \`reports/\`
Rapports et analyses
- \`SESSION_COMPLETE_FINALE.md\` ⭐ Rapport final complet
- \`RAPPORT_MEGA_SESSION_FINALE.md\` ⭐ Rapport mega session
- \`RAPPORT_FINAL_SESSION.md\` - Session précédente
- \`DEEP_AUDIT_REPORT.json\` - Analyse 163 drivers
- \`cascade_errors_report.json\` - Corrections cascade
- Autres rapports JSON

### \`archive/\`
Scripts obsolètes et anciens
- Scripts PowerShell obsolètes
- Anciennes tentatives

### \`references/\`
Données de référence externes
- \`zigbee_herdsman_database.json\` - GitHub data
- \`enrichment_results.json\` - Comparaisons

### \`forum_analysis/\`
Résultats analyse forum
- \`forum_analysis_complete.json\` - NLP + OCR results

### \`mega_analysis/\`
Résultats mega orchestrator
- \`mega_analysis_results.json\` - 15 phases results
- \`productids_cleaning_report.json\` - Nettoyage détails

---

## 🚀 Scripts Principaux

### Analyse Complète
\`\`\`bash
node scripts/analysis/MEGA_ORCHESTRATOR_ULTIMATE.js
\`\`\`

### Fix Tout Automatiquement
\`\`\`bash
node scripts/fixes/FIX_ALL_CASCADE_ERRORS.js
\`\`\`

### Nettoyage ProductIds
\`\`\`bash
node scripts/fixes/CLEAN_PRODUCTIDS_INTELLIGENT.js
\`\`\`

### Analyse Forum
\`\`\`bash
node scripts/forum/FORUM_SCRAPER_ULTIMATE.js
\`\`\`

### Publication
\`\`\`bash
node scripts/publishing/FINAL_PUBLISH_MEGA.js
\`\`\`

---

## 📋 Utilisation

### Validation
\`\`\`bash
homey app build
homey app validate --level=publish
\`\`\`

### Publication
\`\`\`powershell
.\\PUBLISH_NOW.ps1
\`\`\`

### Organisation
\`\`\`bash
node ORGANIZE_FILES.js
\`\`\`

---

**Version:** 1.4.0  
**Dernière organisation:** ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(rootPath, 'INDEX.md'), indexContent);
console.log('   ✅ INDEX.md créé');

console.log('');
console.log('='.repeat(80));
console.log('✅ ORGANISATION TERMINÉE');
console.log('='.repeat(80));
console.log('');

console.log('📊 RÉSUMÉ:');
console.log(`   Dossiers créés: ${Object.keys(folders).length}`);
console.log(`   Fichiers déplacés: ${moved}`);
console.log(`   Erreurs: ${errors}`);
console.log('');

console.log('📁 STRUCTURE FINALE:');
console.log('   /scripts/analysis/ - Analyse et audit');
console.log('   /scripts/fixes/ - Corrections auto');
console.log('   /scripts/images/ - Corrections images');
console.log('   /scripts/forum/ - Analyse forum');
console.log('   /scripts/publishing/ - Publication');
console.log('   /scripts/enrichment/ - Enrichissement');
console.log('   /reports/ - Rapports');
console.log('   /archive/ - Scripts obsolètes');
console.log('');

console.log('📄 Fichiers racine:');
console.log('   PUBLISH_NOW.ps1 - Script publication principal');
console.log('   INDEX.md - Documentation organisation');
console.log('   README.md - Documentation app');
console.log('   package.json - Dépendances');
console.log('');

process.exit(0);
