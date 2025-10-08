#!/usr/bin/env node
/**
 * REORGANIZE_DRY_RUN - Analysis et simulation de réorganisation ultimate_system
 * Analyse la structure actuelle et propose une organisation optimisée
 */
const fs = require('fs');
const path = require('path');

const ultimateDir = __dirname;
const rootDir = path.resolve(ultimateDir, '..');

console.log('🔍 REORGANIZE_DRY_RUN - Analyse de la structure ultimate_system');

// Structure cible organisée
const TARGET_STRUCTURE = {
  'enrichment/': {
    pattern: /(?:ENRICH|ULTIMATE|MEGA|SUPREME|SAFE).*\.js$/,
    description: 'Scripts d\'enrichissement des drivers'
  },
  'validation/': {
    pattern: /(?:VALID|VERIFY|CHECK|AUDIT).*\.js$/,
    description: 'Scripts de validation et vérification'
  },
  'backup/': {
    pattern: /(?:BACKUP|DUMP|EXTRACT|HISTORY).*\.js$/,
    description: 'Scripts de sauvegarde et extraction historique'
  },
  'organization/': {
    pattern: /(?:REORGAN|ORGANIZ|STRUCTURE|CLEAN).*\.js$/,
    description: 'Scripts d\'organisation et nettoyage'
  },
  'git/': {
    pattern: /(?:GIT|BRANCH|COMMIT|CHECKOUT).*\.js$/,
    description: 'Scripts de gestion Git'
  },
  'fusion/': {
    pattern: /(?:FUSION|MERGE|COMBINE).*\.js$/,
    description: 'Scripts de fusion et combinaison'
  },
  'publishing/': {
    pattern: /(?:PUBLISH|FINAL|DEPLOY).*\.js$/,
    description: 'Scripts de publication et déploiement'
  },
  'utilities/': {
    pattern: /(?:UTIL|TOOL|HELPER|CORRECT|FIX|MOD|SMART).*\.js$/,
    description: 'Utilitaires et outils de correction'
  },
  'analysis/': {
    pattern: /(?:ANALYZ|ANALYSE|RAPPORT|STATS|BILAN).*\.js$/,
    description: 'Scripts d\'analyse et rapports'
  },
  'orchestration/': {
    pattern: /(?:ORCHESTR|LAUNCH|MASTER|COMPLETE|RELANCE).*\.js$/,
    description: 'Scripts d\'orchestration et lancement'
  }
};

// Analyse des fichiers actuels
function analyzeCurrentStructure() {
  console.log('\n📊 ANALYSE DE LA STRUCTURE ACTUELLE:');
  
  const files = fs.readdirSync(ultimateDir);
  const jsFiles = files.filter(f => f.endsWith('.js') && f !== 'REORGANIZE_DRY_RUN.js');
  
  console.log(`📁 Fichiers JavaScript dans ultimate_system: ${jsFiles.length}`);
  
  const categorized = {};
  const uncategorized = [];
  
  for (const [category, config] of Object.entries(TARGET_STRUCTURE)) {
    categorized[category] = [];
    
    for (const file of jsFiles) {
      if (config.pattern.test(file)) {
        categorized[category].push(file);
      }
    }
  }
  
  // Fichiers non catégorisés
  for (const file of jsFiles) {
    let found = false;
    for (const [category, config] of Object.entries(TARGET_STRUCTURE)) {
      if (config.pattern.test(file)) {
        found = true;
        break;
      }
    }
    if (!found) {
      uncategorized.push(file);
    }
  }
  
  return { categorized, uncategorized, totalFiles: jsFiles.length };
}

// Analyse des répertoires existants
function analyzeExistingDirectories() {
  console.log('\n📂 RÉPERTOIRES EXISTANTS:');
  
  const items = fs.readdirSync(ultimateDir);
  const directories = items.filter(item => {
    const fullPath = path.join(ultimateDir, item);
    return fs.statSync(fullPath).isDirectory();
  });
  
  const analysis = {};
  
  for (const dir of directories) {
    const fullPath = path.join(ultimateDir, dir);
    try {
      const contents = fs.readdirSync(fullPath);
      const fileCount = contents.filter(f => f.endsWith('.js')).length;
      const totalItems = contents.length;
      
      analysis[dir] = {
        jsFiles: fileCount,
        totalItems: totalItems,
        status: dir.endsWith('_moved') ? 'MOVED' : 'ACTIVE'
      };
      
      console.log(`  📁 ${dir}: ${fileCount} fichiers JS, ${totalItems} items totaux (${analysis[dir].status})`);
    } catch (e) {
      console.log(`  📁 ${dir}: ERREUR D'ACCÈS`);
    }
  }
  
  return analysis;
}

// Proposition de réorganisation
function proposedReorganization(categorized, uncategorized) {
  console.log('\n🎯 PROPOSITION DE RÉORGANISATION:');
  console.log('=' .repeat(60));
  
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      const config = TARGET_STRUCTURE[category];
      console.log(`\n📁 ${category} (${files.length} fichiers)`);
      console.log(`   ${config.description}`);
      
      files.forEach(file => {
        console.log(`   → ${file}`);
      });
    }
  }
  
  if (uncategorized.length > 0) {
    console.log(`\n❓ FICHIERS NON CATÉGORISÉS (${uncategorized.length}):`);
    console.log('   → À analyser manuellement');
    uncategorized.forEach(file => {
      console.log(`   → ${file}`);
    });
  }
}

// Plan d'actions
function generateActionPlan(categorized, dirAnalysis) {
  console.log('\n🚀 PLAN D\'ACTIONS PROPOSÉ:');
  console.log('=' .repeat(60));
  
  // Étapes de réorganisation
  console.log('\n1️⃣ PRÉPARATION:');
  console.log('   → Créer backup de sécurité avant réorganisation');
  console.log('   → Analyser les dépendances entre scripts');
  
  console.log('\n2️⃣ CRÉATION DE STRUCTURE:');
  for (const category of Object.keys(TARGET_STRUCTURE)) {
    const count = categorized[category]?.length || 0;
    if (count > 0) {
      console.log(`   → Créer ultimate_system/${category} (${count} fichiers)`);
    }
  }
  
  console.log('\n3️⃣ MIGRATION DES FICHIERS:');
  let totalMigrations = 0;
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      console.log(`   → Déplacer ${files.length} fichiers vers ${category}`);
      totalMigrations += files.length;
    }
  }
  
  console.log('\n4️⃣ NETTOYAGE:');
  const movedDirs = Object.keys(dirAnalysis).filter(d => d.endsWith('_moved'));
  console.log(`   → Analyser ${movedDirs.length} répertoires '_moved'`);
  console.log('   → Archiver ou supprimer les doublons');
  
  console.log('\n5️⃣ VALIDATION:');
  console.log('   → Vérifier que tous les scripts sont fonctionnels');
  console.log('   → Tester les chemins d\'accès et dépendances');
  
  return {
    totalMigrations,
    movedDirsCount: movedDirs.length,
    categoriesCreated: Object.keys(categorized).filter(k => categorized[k].length > 0).length
  };
}

// Exécution principale
function main() {
  const { categorized, uncategorized, totalFiles } = analyzeCurrentStructure();
  const dirAnalysis = analyzeExistingDirectories();
  
  proposedReorganization(categorized, uncategorized);
  const actionPlan = generateActionPlan(categorized, dirAnalysis);
  
  console.log('\n📊 RÉSUMÉ DU DRY-RUN:');
  console.log('=' .repeat(60));
  console.log(`📄 Total fichiers JS à organiser: ${totalFiles}`);
  console.log(`📁 Catégories à créer: ${actionPlan.categoriesCreated}`);
  console.log(`🔄 Migrations prévues: ${actionPlan.totalMigrations}`);
  console.log(`🗂️ Répertoires '_moved' à traiter: ${actionPlan.movedDirsCount}`);
  console.log(`❓ Fichiers non catégorisés: ${uncategorized.length}`);
  
  // Génération du rapport JSON
  const report = {
    timestamp: new Date().toISOString(),
    analysis: {
      totalJSFiles: totalFiles,
      categorized,
      uncategorized,
      existingDirectories: dirAnalysis
    },
    actionPlan,
    status: 'DRY_RUN_COMPLETED'
  };
  
  const reportPath = path.join(ultimateDir, 'reports', 'reorganization_dry_run.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Rapport détaillé sauvé: ${reportPath}`);
  console.log('\n✅ DRY-RUN TERMINÉ - Prêt pour application avec REORGANIZE_APPLY.js');
}

main();
