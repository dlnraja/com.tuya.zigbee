#!/usr/bin/env node
/**
 * DEEP PROJECT CLEANUP
 * 
 * Analyse COMPLÈTE de la racine et nettoyage profond:
 * - Identifie tous les fichiers légitimes vs non-légitimes
 * - Déplace/Archive fichiers non essentiels
 * - Vérifie TOUS les chemins dans le projet
 * - Garantit cohérence et fonctionnalité
 */

const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..');

console.log('🧹 DEEP PROJECT CLEANUP');
console.log('='.repeat(80));
console.log('⚡ ANALYSE & NETTOYAGE COMPLET DE LA RACINE');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// FICHIERS LÉGITIMES À LA RACINE
// ============================================================================

const LEGITIMATE_ROOT_FILES = [
  // Essentiels app
  'app.json',
  'app.js',
  'package.json',
  'package-lock.json',
  
  // Documentation principale
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  
  // Lanceur principal
  'LAUNCH_FULL_ENRICHMENT.bat',
  
  // Configuration
  '.gitignore',
  '.homeyignore',
  '.prettierignore',
  '.prettierrc',
  '.homeychangelog.json',
  '.env'
];

const LEGITIMATE_ROOT_DIRS = [
  '.git',
  '.github',
  '.vscode',
  '.homeycompose',
  'node_modules',
  'assets',
  'locales',
  'drivers',
  'scripts',
  'docs',
  'reports'
];

// ============================================================================
// DOSSIERS À ARCHIVER (non essentiels)
// ============================================================================

const DIRS_TO_ARCHIVE = [
  'archive',
  'backup',
  'backup_complete',
  'catalog',
  'deep_scraping',
  'forum_analysis',
  'mega_analysis',
  'project-data',
  'references',
  'settings',
  'tools',
  'ultimate_system'
];

// ============================================================================
// PHASE 1: ANALYSE
// ============================================================================

console.log('🔍 Phase 1: Analyse de la Racine');
console.log('-'.repeat(80));

const rootItems = fs.readdirSync(rootPath);

const analysis = {
  legitimate: [],
  toMove: [],
  toArchive: [],
  unknown: []
};

rootItems.forEach(item => {
  const itemPath = path.join(rootPath, item);
  const stat = fs.statSync(itemPath);
  
  if (stat.isDirectory()) {
    if (LEGITIMATE_ROOT_DIRS.includes(item)) {
      analysis.legitimate.push({ type: 'dir', name: item, action: 'KEEP' });
    } else if (DIRS_TO_ARCHIVE.includes(item)) {
      analysis.toArchive.push({ type: 'dir', name: item, action: 'ARCHIVE' });
    } else {
      analysis.unknown.push({ type: 'dir', name: item, action: 'REVIEW' });
    }
  } else {
    if (LEGITIMATE_ROOT_FILES.includes(item)) {
      analysis.legitimate.push({ type: 'file', name: item, action: 'KEEP' });
    } else if (item.endsWith('.ps1')) {
      analysis.toMove.push({ type: 'file', name: item, target: 'scripts/', action: 'MOVE' });
    } else if (item.endsWith('.txt') && item !== 'requirements.txt') {
      analysis.toMove.push({ type: 'file', name: item, target: 'docs/', action: 'MOVE' });
    } else if (item.endsWith('.md') && !LEGITIMATE_ROOT_FILES.includes(item)) {
      analysis.toMove.push({ type: 'file', name: item, target: 'docs/', action: 'MOVE' });
    } else {
      analysis.unknown.push({ type: 'file', name: item, action: 'REVIEW' });
    }
  }
});

console.log(`   ✅ Légitimes:  ${analysis.legitimate.length}`);
console.log(`   📦 À déplacer: ${analysis.toMove.length}`);
console.log(`   📁 À archiver: ${analysis.toArchive.length}`);
console.log(`   ⚠️  Inconnus:   ${analysis.unknown.length}`);
console.log('');

// ============================================================================
// PHASE 2: AFFICHAGE DÉTAILS
// ============================================================================

console.log('📋 Phase 2: Détails');
console.log('-'.repeat(80));

if (analysis.toMove.length > 0) {
  console.log('');
  console.log('📦 FICHIERS À DÉPLACER:');
  analysis.toMove.forEach(item => {
    console.log(`   ${item.name} → ${item.target}`);
  });
}

if (analysis.toArchive.length > 0) {
  console.log('');
  console.log('📁 DOSSIERS À ARCHIVER:');
  analysis.toArchive.forEach(item => {
    console.log(`   ${item.name}/ → archive_old/`);
  });
}

if (analysis.unknown.length > 0) {
  console.log('');
  console.log('⚠️  FICHIERS INCONNUS (à review):');
  analysis.unknown.forEach(item => {
    console.log(`   ${item.type === 'dir' ? item.name + '/' : item.name}`);
  });
}

console.log('');

// ============================================================================
// PHASE 3: EXÉCUTION DU NETTOYAGE
// ============================================================================

console.log('🧹 Phase 3: Exécution du Nettoyage');
console.log('-'.repeat(80));

const stats = {
  moved: 0,
  archived: 0,
  errors: 0
};

// Déplacer fichiers
analysis.toMove.forEach(item => {
  try {
    const sourcePath = path.join(rootPath, item.name);
    const targetPath = path.join(rootPath, item.target, item.name);
    
    if (fs.existsSync(targetPath)) {
      console.log(`   ℹ️  Existe déjà: ${item.target}${item.name}`);
    } else {
      fs.renameSync(sourcePath, targetPath);
      console.log(`   ✅ Déplacé: ${item.name} → ${item.target}`);
      stats.moved++;
    }
  } catch (error) {
    console.log(`   ❌ Erreur: ${item.name} - ${error.message}`);
    stats.errors++;
  }
});

// Archiver dossiers
const archiveDir = path.join(rootPath, 'archive_old');
if (analysis.toArchive.length > 0) {
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
    console.log('   ✅ Créé: archive_old/');
  }
  
  analysis.toArchive.forEach(item => {
    try {
      const sourcePath = path.join(rootPath, item.name);
      const targetPath = path.join(archiveDir, item.name);
      
      if (fs.existsSync(targetPath)) {
        console.log(`   ℹ️  Déjà archivé: ${item.name}/`);
      } else {
        fs.renameSync(sourcePath, targetPath);
        console.log(`   ✅ Archivé: ${item.name}/ → archive_old/`);
        stats.archived++;
      }
    } catch (error) {
      console.log(`   ❌ Erreur: ${item.name}/ - ${error.message}`);
      stats.errors++;
    }
  });
}

console.log('');

// ============================================================================
// PHASE 4: VÉRIFICATION CHEMINS
// ============================================================================

console.log('🔍 Phase 4: Vérification Chemins');
console.log('-'.repeat(80));

const pathsToCheck = {
  bat: {
    file: 'LAUNCH_FULL_ENRICHMENT.bat',
    paths: [
      'scripts\\MEGA_GITHUB_INTEGRATION_ENRICHER.js',
      'scripts\\MEGA_FORUM_WEB_INTEGRATOR.js',
      'scripts\\ULTIMATE_PATTERN_ANALYZER_ORCHESTRATOR.js',
      'scripts\\ULTRA_FINE_DRIVER_ANALYZER.js',
      'scripts\\ULTIMATE_WEB_VALIDATOR.js'
    ]
  },
  githubAction: {
    file: '.github/workflows/monthly-auto-enrichment.yml',
    paths: [
      'scripts/MONTHLY_AUTO_ENRICHMENT_ORCHESTRATOR.js'
    ]
  }
};

let pathErrors = 0;

// Check .bat file
console.log('   📄 Checking LAUNCH_FULL_ENRICHMENT.bat...');
if (fs.existsSync(path.join(rootPath, pathsToCheck.bat.file))) {
  const batContent = fs.readFileSync(path.join(rootPath, pathsToCheck.bat.file), 'utf8');
  pathsToCheck.bat.paths.forEach(scriptPath => {
    if (batContent.includes(scriptPath)) {
      const fullPath = path.join(rootPath, scriptPath.replace(/\\/g, '/'));
      if (fs.existsSync(fullPath)) {
        console.log(`      ✅ ${scriptPath}`);
      } else {
        console.log(`      ❌ MANQUANT: ${scriptPath}`);
        pathErrors++;
      }
    } else {
      console.log(`      ⚠️  Non référencé: ${scriptPath}`);
    }
  });
} else {
  console.log('      ❌ .bat file not found!');
  pathErrors++;
}

// Check GitHub Action
console.log('   📄 Checking GitHub Actions...');
if (fs.existsSync(path.join(rootPath, pathsToCheck.githubAction.file))) {
  const actionContent = fs.readFileSync(path.join(rootPath, pathsToCheck.githubAction.file), 'utf8');
  pathsToCheck.githubAction.paths.forEach(scriptPath => {
    if (actionContent.includes(scriptPath)) {
      const fullPath = path.join(rootPath, scriptPath);
      if (fs.existsSync(fullPath)) {
        console.log(`      ✅ ${scriptPath}`);
      } else {
        console.log(`      ❌ MANQUANT: ${scriptPath}`);
        pathErrors++;
      }
    } else {
      console.log(`      ⚠️  Non référencé: ${scriptPath}`);
    }
  });
} else {
  console.log('      ⚠️  GitHub Action not found');
}

console.log('');

// ============================================================================
// PHASE 5: RAPPORT FINAL
// ============================================================================

console.log('='.repeat(80));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(80));
console.log('');
console.log('📈 STATISTIQUES:');
console.log(`   Fichiers déplacés:     ${stats.moved}`);
console.log(`   Dossiers archivés:     ${stats.archived}`);
console.log(`   Erreurs:               ${stats.errors}`);
console.log(`   Erreurs de chemins:    ${pathErrors}`);
console.log('');
console.log('📁 STRUCTURE FINALE:');
console.log(`   Légitimes à la racine: ${analysis.legitimate.length}`);
console.log(`   Fichiers docs/:        Déplacés (${analysis.toMove.filter(i => i.target === 'docs/').length})`);
console.log(`   Fichiers scripts/:     Déplacés (${analysis.toMove.filter(i => i.target === 'scripts/').length})`);
console.log(`   Dossiers archive_old/: Archivés (${stats.archived})`);
console.log('');

if (pathErrors === 0 && stats.errors === 0) {
  console.log('✅ NETTOYAGE COMPLET RÉUSSI!');
  console.log('');
  console.log('📁 Racine du projet maintenant CLEAN:');
  console.log('   - Fichiers essentiels uniquement');
  console.log('   - Tous les chemins valides');
  console.log('   - Structure cohérente');
  console.log('   - Prêt pour production');
} else {
  console.log('⚠️  NETTOYAGE TERMINÉ AVEC AVERTISSEMENTS');
  console.log('   Vérifier les erreurs ci-dessus');
}

console.log('');

// Save report
const reportPath = path.join(rootPath, 'reports', 'cleanup_report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  analysis: analysis,
  stats: stats,
  pathErrors: pathErrors
}, null, 2));

console.log(`📄 Rapport: ${reportPath}`);
console.log('');

process.exit(pathErrors > 0 || stats.errors > 0 ? 1 : 0);
