#!/usr/bin/env node
/**
 * ORGANIZE PROJECT STRUCTURE
 * 
 * Réorganise complètement la structure du projet:
 * - /scripts - Tous les scripts .js
 * - /docs - Toute la documentation .md
 * - /reports - Tous les rapports .json
 * - /drivers - Tous les drivers (déjà organisé)
 * - Racine - Fichiers essentiels (.bat, app.json, package.json, README.md, etc.)
 */

const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');

console.log('📁 PROJECT STRUCTURE ORGANIZER');
console.log('='.repeat(80));
console.log('⚡ RÉORGANISATION COMPLÈTE DU PROJET');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// STRUCTURE CIBLE
// ============================================================================

const TARGET_STRUCTURE = {
  root: [
    // Fichiers essentiels qui DOIVENT rester à la racine
    'LAUNCH_FULL_ENRICHMENT.bat',
    'app.json',
    'package.json',
    'package-lock.json',
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    '.gitignore',
    '.homeyignore',
    '.homeychangelog.json',
    'locales',
    'drivers',
    '.homeycompose',
    'assets',
    'app.js',
    'node_modules'
  ],
  
  scripts: [
    // Tous les scripts .js (sauf app.js)
    /\.js$/
  ],
  
  docs: [
    // Toute la documentation (sauf README.md, CHANGELOG.md, CONTRIBUTING.md)
    /_REPORT\.md$/,
    /_GUIDE\.md$/,
    /_SUMMARY\.md$/,
    /SESSION_COMPLETE/,
    /FORUM_RESPONSE/,
    /PUBLICATION_STATUS/,
    /FINAL_VALIDATION/,
    /AUTOMATION_SYSTEM/
  ],
  
  reports: [
    // Tous les rapports JSON
    /_report\.json$/,
    /enrichment_report/,
    /integration_report/,
    /validation_report/,
    /test_report/
  ]
};

// ============================================================================
// CRÉATION DES DOSSIERS
// ============================================================================

console.log('📂 Phase 1: Création Structure');
console.log('-'.repeat(80));

const directories = ['scripts', 'docs', 'reports'];

directories.forEach(dir => {
  const dirPath = path.join(rootPath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✅ Créé: ${dir}/`);
  } else {
    console.log(`   ✓ Existe: ${dir}/`);
  }
});

console.log('');

// ============================================================================
// ANALYSE ET ORGANISATION
// ============================================================================

console.log('🔍 Phase 2: Analyse & Organisation');
console.log('-'.repeat(80));

const stats = {
  moved: 0,
  skipped: 0,
  errors: 0
};

function shouldStayInRoot(filename) {
  return TARGET_STRUCTURE.root.includes(filename) ||
         filename.startsWith('.git') ||
         filename === 'node_modules' ||
         filename === '.homeycompose' ||
         filename === 'drivers' ||
         filename === 'locales' ||
         filename === 'assets';
}

function getTargetDirectory(filename) {
  // Scripts
  if (filename.endsWith('.js') && 
      filename !== 'app.js' && 
      !shouldStayInRoot(filename)) {
    return 'scripts';
  }
  
  // Documentation
  if (filename.endsWith('.md') && 
      !['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'].includes(filename)) {
    return 'docs';
  }
  
  // Reports JSON
  if (filename.endsWith('.json') && 
      !['package.json', 'package-lock.json', '.homeychangelog.json'].includes(filename) &&
      !shouldStayInRoot(filename)) {
    return 'reports';
  }
  
  return null; // Reste à la racine
}

// Lister fichiers racine
const files = fs.readdirSync(rootPath);

files.forEach(filename => {
  const sourcePath = path.join(rootPath, filename);
  const stat = fs.statSync(sourcePath);
  
  // Skip directories
  if (stat.isDirectory()) {
    if (!shouldStayInRoot(filename) && 
        !['scripts', 'docs', 'reports'].includes(filename)) {
      console.log(`   ⚠️  Directory non géré: ${filename}/`);
    }
    return;
  }
  
  // Check if should be moved
  const targetDir = getTargetDirectory(filename);
  
  if (targetDir) {
    const targetPath = path.join(rootPath, targetDir, filename);
    
    // Check if already in target
    if (fs.existsSync(targetPath)) {
      console.log(`   ℹ️  Existe déjà: ${targetDir}/${filename}`);
      stats.skipped++;
      return;
    }
    
    try {
      fs.renameSync(sourcePath, targetPath);
      console.log(`   ✅ Déplacé: ${filename} → ${targetDir}/`);
      stats.moved++;
    } catch (error) {
      console.log(`   ❌ Erreur: ${filename} - ${error.message}`);
      stats.errors++;
    }
  } else {
    console.log(`   ✓ Racine: ${filename}`);
  }
});

console.log('');

// ============================================================================
// CRÉATION README POUR CHAQUE DOSSIER
// ============================================================================

console.log('📝 Phase 3: README pour chaque dossier');
console.log('-'.repeat(80));

// README scripts/ (déjà existe, on vérifie)
const scriptsReadme = path.join(rootPath, 'scripts', 'README.md');
if (fs.existsSync(scriptsReadme)) {
  console.log('   ✓ scripts/README.md existe');
} else {
  fs.writeFileSync(scriptsReadme, `# 🛠️ Scripts

All automation and analysis scripts for the Universal Tuya Zigbee app.

Run scripts from project root:
\`\`\`bash
node scripts/[SCRIPT_NAME].js
\`\`\`
`);
  console.log('   ✅ Créé: scripts/README.md');
}

// README docs/ (déjà existe, on vérifie)
const docsReadme = path.join(rootPath, 'docs', 'README.md');
if (fs.existsSync(docsReadme)) {
  console.log('   ✓ docs/README.md existe');
} else {
  fs.writeFileSync(docsReadme, `# 📚 Documentation

All documentation, reports, and guides for the Universal Tuya Zigbee app.

See individual documents for specific topics.
`);
  console.log('   ✅ Créé: docs/README.md');
}

// README reports/ (nouveau)
const reportsReadme = path.join(rootPath, 'reports', 'README.md');
if (fs.existsSync(reportsReadme)) {
  console.log('   ✓ reports/README.md existe');
} else {
  fs.writeFileSync(reportsReadme, `# 📊 Reports

All JSON reports generated by automation scripts.

Reports are generated automatically and should not be edited manually.
`);
  console.log('   ✅ Créé: reports/README.md');
}

console.log('');

// ============================================================================
// RAPPORT FINAL
// ============================================================================

console.log('='.repeat(80));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(80));
console.log('');
console.log(`📈 STATISTIQUES:`);
console.log(`   Fichiers déplacés:  ${stats.moved}`);
console.log(`   Fichiers ignorés:   ${stats.skipped}`);
console.log(`   Erreurs:            ${stats.errors}`);
console.log('');
console.log('📁 STRUCTURE FINALE:');
console.log('   /                   - Fichiers essentiels (.bat, app.json, etc.)');
console.log('   /scripts            - Scripts Node.js');
console.log('   /docs               - Documentation & rapports MD');
console.log('   /reports            - Rapports JSON');
console.log('   /drivers            - Drivers Homey');
console.log('   /.homeycompose      - Homey configuration');
console.log('   /assets             - Assets (icons, images)');
console.log('');
console.log('✅ Organisation terminée!');
console.log('');
console.log('⚠️  IMPORTANT: Mettre à jour:');
console.log('   - LAUNCH_FULL_ENRICHMENT.bat (chemins scripts/)');
console.log('   - .github/workflows/*.yml (chemins scripts/)');
console.log('');

process.exit(0);
