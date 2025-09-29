#!/usr/bin/env node
/**
 * REORGANIZE_APPLY - Application de la réorganisation ultimate_system
 * Exécute la réorganisation basée sur l'analyse du dry-run
 */
const fs = require('fs');
const path = require('path');

const ultimateDir = __dirname;
const rootDir = path.resolve(ultimateDir, '..');

console.log('🚀 REORGANIZE_APPLY - Application de la réorganisation ultimate_system');

// Structure cible identique au dry-run
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

// Utilitaires
function safeMove(source, destination) {
  try {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(source, destination);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors du déplacement ${source} → ${destination}: ${error.message}`);
    return false;
  }
}

function createBackup() {
  const backupDir = path.join(ultimateDir, '_backup_before_reorganization');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup_${timestamp}`);
  
  console.log(`\n💾 Création backup de sécurité: ${backupPath}`);
  
  try {
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Copier tous les fichiers JS du niveau racine
    const files = fs.readdirSync(ultimateDir);
    const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('REORGANIZE_'));
    
    let copiedCount = 0;
    for (const file of jsFiles) {
      const source = path.join(ultimateDir, file);
      const destination = path.join(backupPath, file);
      
      try {
        fs.copyFileSync(source, destination);
        copiedCount++;
      } catch (error) {
        console.error(`❌ Erreur copie ${file}: ${error.message}`);
      }
    }
    
    console.log(`✅ Backup créé: ${copiedCount} fichiers sauvés`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Erreur création backup: ${error.message}`);
    return null;
  }
}

function categorizeFiles() {
  console.log('\n📂 CATÉGORISATION DES FICHIERS:');
  
  const files = fs.readdirSync(ultimateDir);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.startsWith('REORGANIZE_'));
  
  const categorized = {};
  const uncategorized = [];
  
  // Initialiser les catégories
  for (const category of Object.keys(TARGET_STRUCTURE)) {
    categorized[category] = [];
  }
  
  // Catégoriser les fichiers
  for (const file of jsFiles) {
    let found = false;
    
    for (const [category, config] of Object.entries(TARGET_STRUCTURE)) {
      if (config.pattern.test(file)) {
        categorized[category].push(file);
        found = true;
        break; // Prendre la première catégorie qui match
      }
    }
    
    if (!found) {
      uncategorized.push(file);
    }
  }
  
  return { categorized, uncategorized };
}

function createDirectoryStructure(categorized) {
  console.log('\n📁 CRÉATION DE LA STRUCTURE DE RÉPERTOIRES:');
  
  let created = 0;
  
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      const dirPath = path.join(ultimateDir, category);
      
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Créé: ${category} (pour ${files.length} fichiers)`);
        created++;
      } catch (error) {
        console.error(`❌ Erreur création ${category}: ${error.message}`);
      }
    }
  }
  
  return created;
}

function migrateFiles(categorized) {
  console.log('\n🔄 MIGRATION DES FICHIERS:');
  
  let migrated = 0;
  let errors = 0;
  
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      console.log(`\n📁 Migration vers ${category}:`);
      
      for (const file of files) {
        const source = path.join(ultimateDir, file);
        const destination = path.join(ultimateDir, category, file);
        
        if (safeMove(source, destination)) {
          console.log(`  ✅ ${file}`);
          migrated++;
        } else {
          console.log(`  ❌ ${file}`);
          errors++;
        }
      }
    }
  }
  
  return { migrated, errors };
}

function handleUncategorizedFiles(uncategorized) {
  if (uncategorized.length === 0) {
    return 0;
  }
  
  console.log(`\n❓ TRAITEMENT DES FICHIERS NON CATÉGORISÉS (${uncategorized.length}):`);
  
  // Créer un répertoire spécial pour les fichiers non catégorisés
  const uncategorizedDir = path.join(ultimateDir, '_uncategorized');
  
  try {
    fs.mkdirSync(uncategorizedDir, { recursive: true });
  } catch (error) {
    console.error(`❌ Erreur création _uncategorized: ${error.message}`);
    return 0;
  }
  
  let moved = 0;
  
  for (const file of uncategorized) {
    const source = path.join(ultimateDir, file);
    const destination = path.join(uncategorizedDir, file);
    
    if (safeMove(source, destination)) {
      console.log(`  ✅ ${file} → _uncategorized/`);
      moved++;
    } else {
      console.log(`  ❌ ${file}`);
    }
  }
  
  return moved;
}

function createIndexFiles(categorized) {
  console.log('\n📝 CRÉATION D\'INDEX DANS CHAQUE CATÉGORIE:');
  
  let created = 0;
  
  for (const [category, files] of Object.entries(categorized)) {
    if (files.length > 0) {
      const categoryDir = path.join(ultimateDir, category);
      const indexPath = path.join(categoryDir, 'README.md');
      
      const config = TARGET_STRUCTURE[category];
      const indexContent = `# ${category.replace('/', '')}

${config.description}

## Fichiers dans cette catégorie (${files.length})

${files.map(file => `- **${file}**`).join('\n')}

---
*Généré automatiquement par REORGANIZE_APPLY*
*Date: ${new Date().toISOString()}*
`;
      
      try {
        fs.writeFileSync(indexPath, indexContent);
        console.log(`  ✅ ${category}README.md créé`);
        created++;
      } catch (error) {
        console.error(`  ❌ Erreur création index ${category}: ${error.message}`);
      }
    }
  }
  
  return created;
}

function cleanupMovedDirectories() {
  console.log('\n🧹 ANALYSE DES RÉPERTOIRES _moved:');
  
  const items = fs.readdirSync(ultimateDir);
  const movedDirs = items.filter(item => {
    const fullPath = path.join(ultimateDir, item);
    return fs.statSync(fullPath).isDirectory() && item.endsWith('_moved');
  });
  
  console.log(`Trouvé ${movedDirs.length} répertoires '_moved':`);
  
  for (const dir of movedDirs) {
    const fullPath = path.join(ultimateDir, dir);
    try {
      const contents = fs.readdirSync(fullPath);
      const jsFiles = contents.filter(f => f.endsWith('.js'));
      console.log(`  📁 ${dir}: ${jsFiles.length} fichiers JS, ${contents.length} items totaux`);
    } catch (error) {
      console.log(`  📁 ${dir}: ERREUR D'ACCÈS`);
    }
  }
  
  console.log('  ℹ️  Répertoires \'_moved\' conservés pour analyse manuelle');
  return movedDirs.length;
}

function generateFinalReport(stats) {
  const reportPath = path.join(ultimateDir, 'reports', 'reorganization_applied.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    version: 'REORGANIZE_APPLY',
    execution: {
      backupCreated: stats.backupPath !== null,
      backupPath: stats.backupPath,
      categoriesCreated: stats.categoriesCreated,
      filesMigrated: stats.filesMigrated,
      migrationErrors: stats.migrationErrors,
      uncategorizedMoved: stats.uncategorizedMoved,
      indexFilesCreated: stats.indexFilesCreated,
      movedDirsFound: stats.movedDirsFound
    },
    summary: {
      totalSuccess: stats.filesMigrated + stats.uncategorizedMoved,
      totalErrors: stats.migrationErrors,
      successRate: Math.round(((stats.filesMigrated + stats.uncategorizedMoved) / (stats.filesMigrated + stats.uncategorizedMoved + stats.migrationErrors)) * 100)
    },
    status: stats.migrationErrors === 0 ? 'COMPLETED_SUCCESS' : 'COMPLETED_WITH_ERRORS'
  };
  
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

// Exécution principale
function main() {
  console.log('Starting reorganization...');
  
  // 1. Création backup de sécurité
  const backupPath = createBackup();
  
  // 2. Catégorisation des fichiers
  const { categorized, uncategorized } = categorizeFiles();
  
  // 3. Création structure de répertoires
  const categoriesCreated = createDirectoryStructure(categorized);
  
  // 4. Migration des fichiers
  const { migrated, errors } = migrateFiles(categorized);
  
  // 5. Traitement des fichiers non catégorisés
  const uncategorizedMoved = handleUncategorizedFiles(uncategorized);
  
  // 6. Création des index dans chaque catégorie
  const indexFilesCreated = createIndexFiles(categorized);
  
  // 7. Analyse des répertoires _moved
  const movedDirsFound = cleanupMovedDirectories();
  
  // 8. Rapport final
  const stats = {
    backupPath,
    categoriesCreated,
    filesMigrated: migrated,
    migrationErrors: errors,
    uncategorizedMoved,
    indexFilesCreated,
    movedDirsFound
  };
  
  const reportPath = generateFinalReport(stats);
  
  // Résumé final
  console.log('\n🎉 RÉORGANISATION TERMINÉE!');
  console.log('=' .repeat(60));
  console.log(`💾 Backup créé: ${backupPath ? 'OUI' : 'NON'}`);
  console.log(`📁 Catégories créées: ${categoriesCreated}`);
  console.log(`✅ Fichiers migrés: ${migrated}`);
  console.log(`❓ Non catégorisés déplacés: ${uncategorizedMoved}`);
  console.log(`❌ Erreurs: ${errors}`);
  console.log(`📝 Index créés: ${indexFilesCreated}`);
  console.log(`🗂️ Répertoires '_moved': ${movedDirsFound}`);
  console.log(`📊 Taux de succès: ${Math.round(((migrated + uncategorizedMoved) / (migrated + uncategorizedMoved + errors)) * 100)}%`);
  console.log(`📋 Rapport: ${reportPath}`);
  
  console.log(errors === 0 ? '\n✅ RÉORGANISATION RÉUSSIE!' : '\n⚠️ RÉORGANISATION TERMINÉE AVEC ERREURS');
}

main();
