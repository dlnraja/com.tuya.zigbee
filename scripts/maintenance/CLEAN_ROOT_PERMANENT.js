#!/usr/bin/env node

/**
 * 🧹 NETTOYAGE RACINE PERMANENT
 * 
 * Range TOUS les fichiers de la racine dans des dossiers appropriés
 * À exécuter UNE FOIS pour nettoyer définitivement
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// Fichiers ESSENTIELS à garder à la racine
const ESSENTIAL_FILES = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'package.json',
  'package-lock.json',
  'app.json',
  'app.js',
  '.gitignore',
  '.gitattributes',
  '.homeyignore',
  '.homeychangelog.json',
  '.prettierignore',
  '.prettierrc',
  '.env',
  '.env.example',
  'jest.config.js'
];

// Mappings de destination
const MAPPINGS = {
  // Commits
  '.commit': 'archive/commits',
  'commit-': 'archive/commits',
  'COMMIT_': 'archive/commits',
  
  // Docs markdown
  '_PLAN': 'archive/plans',
  '_SUCCESS': 'archive/sessions',
  '_COMPLETE': 'archive/sessions',
  '_ANALYSIS': 'archive/analysis',
  '_REPORT': 'archive/reports',
  'ACTION_PLAN': 'archive/plans',
  'MIGRATION': 'archive/migrations',
  'DEPLOYMENT': 'archive/deployments',
  'IMPLEMENTATION': 'archive/implementations',
  'SESSION_': 'archive/sessions',
  'STATUS_': 'archive/status',
  'VERSION_': 'archive/versions',
  'V4.': 'archive/versions',
  'V34_': 'archive/versions',
  'VALIDATION': 'archive/validation',
  'WORKFLOW': 'archive/workflows',
  'GITHUB_ACTIONS': 'archive/github',
  'FORUM_': 'archive/forum',
  'EMAIL_': 'archive/emails',
  'DIAGNOSTIC': 'archive/diagnostics',
  'REFACTORING': 'archive/refactoring',
  'CONSOLIDATION': 'archive/consolidation',
  'HYBRID': 'archive/hybrid',
  'ENRICHMENT': 'archive/enrichment',
  'MONITORING': 'archive/monitoring',
  'PUBLICATION': 'archive/publications',
  'BATTERY': 'archive/battery',
  'POWER': 'archive/power',
  'IMAGE': 'archive/images-docs',
  'MISSING': 'archive/missing',
  'BUTTON': 'archive/buttons',
  'CORRECTION': 'archive/corrections',
  'AGGREGATE': 'archive/errors',
  'NEXT_STEPS': 'archive/planning',
  'README_': 'archive/readmes',
  'QUICK': 'archive/guides',
  'FINAL': 'archive/final',
  'SUCCESS': 'archive/success',
  'ULTIMATE': 'archive/ultimate',
  'REFONTE': 'archive/refonte',
  'COHERENCE': 'archive/coherence',
  'ALIEXPRESS': 'archive/aliexpress',
  'AUDIT': 'archive/audits',
  
  // Scripts
  'FIX_': 'scripts/fixes',
  'TEST_': 'scripts/tests',
  'PUSH.js': 'scripts/deployment',
  'check_': 'scripts/utils',
  'list_': 'scripts/utils',
  
  // Data files
  '_REPORT.json': 'project-data/reports',
  '_ANALYSIS.json': 'project-data/analysis',
  'BRAND_': 'project-data/brands',
  'DUPLICATES': 'project-data',
  'CLEANUP': 'project-data',
  'CONFIG_': 'project-data/configs',
  'SDK3': 'project-data/sdk3',
  'button_consolidation': 'project-data',
  'driver_merge': 'project-data',
  'hybrid_drivers': 'project-data',
  
  // Backups
  'app.json.backup': 'archive/backups',
  
  // Triggers
  'trigger-': 'archive/triggers',
  '.trigger': 'archive/triggers',
  '.publish': 'archive/triggers',
  
  // PowerShell scripts
  '.ps1': 'scripts/powershell',
  
  // Batch files
  '.bat': 'scripts/batch',
  
  // Text files
  '.txt': 'archive/texts',
  'README.txt': 'archive/readmes',
  'SESSION_COMPLETE.txt': 'archive/sessions',
  
  // CSV files
  '.csv': 'project-data/csv'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getDestination(filename) {
  // Vérifier fichiers essentiels
  if (ESSENTIAL_FILES.includes(filename)) {
    return null; // Garder à la racine
  }
  
  // Vérifier par pattern
  for (const [pattern, dest] of Object.entries(MAPPINGS)) {
    if (filename.includes(pattern)) {
      return dest;
    }
  }
  
  // Par extension
  const ext = path.extname(filename);
  if (ext === '.md') return 'archive/markdown';
  if (ext === '.json') return 'project-data/json';
  if (ext === '.js') return 'scripts/archive';
  if (ext === '.txt') return 'archive/texts';
  if (ext === '.ps1') return 'scripts/powershell';
  if (ext === '.bat') return 'scripts/batch';
  if (ext === '.csv') return 'project-data/csv';
  
  return 'archive/misc';
}

function moveFile(from, to) {
  try {
    ensureDir(path.dirname(to));
    
    // Si fichier existe déjà, ajouter timestamp
    if (fs.existsSync(to)) {
      const ext = path.extname(to);
      const base = path.basename(to, ext);
      const dir = path.dirname(to);
      to = path.join(dir, `${base}.${Date.now()}${ext}`);
    }
    
    fs.renameSync(from, to);
    return true;
  } catch (err) {
    console.error(`   ❌ Error moving ${from}: ${err.message}`);
    return false;
  }
}

function cleanRoot() {
  console.log('🧹 NETTOYAGE RACINE PERMANENT\n');
  console.log('Rangement de TOUS les fichiers non essentiels...\n');
  
  const files = fs.readdirSync(ROOT);
  let moved = 0;
  let kept = 0;
  let skipped = 0;
  
  const categories = {};
  
  for (const file of files) {
    const filePath = path.join(ROOT, file);
    const stat = fs.statSync(filePath);
    
    // Skip directories et fichiers cachés système
    if (stat.isDirectory()) {
      continue;
    }
    
    // Vérifier si essentiel
    if (ESSENTIAL_FILES.includes(file)) {
      kept++;
      continue;
    }
    
    // Déterminer destination
    const dest = getDestination(file);
    if (!dest) {
      kept++;
      continue;
    }
    
    // Préparer chemin destination
    const destPath = path.join(ROOT, dest, file);
    
    // Déplacer
    if (moveFile(filePath, destPath)) {
      moved++;
      categories[dest] = (categories[dest] || 0) + 1;
      console.log(`✓ ${file} → ${dest}/`);
    } else {
      skipped++;
    }
  }
  
  // Rapport
  console.log('\n' + '='.repeat(70));
  console.log('📊 RÉSULTAT NETTOYAGE');
  console.log('='.repeat(70));
  console.log(`\n✅ Fichiers déplacés: ${moved}`);
  console.log(`✓  Fichiers gardés (essentiels): ${kept}`);
  console.log(`⚠️  Fichiers skippés (erreurs): ${skipped}`);
  
  console.log('\n📁 Distribution par catégorie:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} fichiers`);
    });
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Racine propre ! Fichiers essentiels uniquement.');
  console.log('='.repeat(70));
  
  // Lister fichiers restants
  const remaining = fs.readdirSync(ROOT)
    .filter(f => fs.statSync(path.join(ROOT, f)).isFile())
    .filter(f => !f.startsWith('.'));
  
  if (remaining.length <= 15) {
    console.log('\n📁 Fichiers restants à la racine:');
    remaining.forEach(f => console.log(`   - ${f}`));
  }
}

// Exécution
try {
  cleanRoot();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
