const fs = require('fs');

console.log('📋 BACKUP SUMMARY - Résumé complet');

// Compter backups organisés par branche
const backupStats = {
  totalBackups: 0,
  byBranch: {},
  validStructure: 0
};

if (fs.existsSync('./backup')) {
  const items = fs.readdirSync('./backup');
  
  items.forEach(item => {
    backupStats.totalBackups++;
    
    // Extraire branche et hash
    const match = item.match(/^([a-z]+)_([a-f0-9]+)$/);
    if (match) {
      const [, branch, hash] = match;
      
      if (!backupStats.byBranch[branch]) {
        backupStats.byBranch[branch] = [];
      }
      
      backupStats.byBranch[branch].push({
        hash,
        fullName: item
      });
      
      backupStats.validStructure++;
    }
  });
}

// Afficher résumé
console.log(`\n📊 STATISTIQUES BACKUP:`);
console.log(`   Total: ${backupStats.totalBackups} dossiers`);
console.log(`   Structure valide: ${backupStats.validStructure}`);

Object.entries(backupStats.byBranch).forEach(([branch, commits]) => {
  console.log(`   🌿 ${branch}: ${commits.length} commits`);
});

// Vérifier modules backup
const backupModules = [
  'modules/backup/backup_enricher.js',
  'modules/backup/git_dumper.js',
  'modules/backup/backup_cleaner.js'
];

let modulesPresent = 0;
backupModules.forEach(module => {
  if (fs.existsSync(module)) {
    modulesPresent++;
    console.log(`   ✅ ${module.split('/').pop()}`);
  }
});

console.log(`\n🎯 ÉTAT SYSTÈME BACKUP:`);
console.log(`   Backups organisés: ${backupStats.validStructure > 0 ? 'OUI' : 'NON'}`);
console.log(`   Modules actifs: ${modulesPresent}/${backupModules.length}`);
console.log(`   Architecture: ${modulesPresent === backupModules.length ? 'COMPLÈTE' : 'PARTIELLE'}`);

console.log('\n✅ BACKUP SUMMARY TERMINÉ');
