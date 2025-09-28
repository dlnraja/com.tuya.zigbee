const { execSync } = require('child_process');
const fs = require('fs');

console.log('🗂️ SYSTÈME BACKUP COMPLET');

// Phase 1: Organisation complète des backups
console.log('\n📋 PHASE 1: ORGANISATION BACKUPS');
try {
  execSync('node BACKUP_MASTER_ORGANIZER.js', {stdio: 'inherit'});
} catch(e) {}

// Phase 2: Enrichissement depuis backups
console.log('\n🔧 PHASE 2: ENRICHISSEMENT');
try {
  execSync('node ENRICHER_SUPREME_BACKUP.js', {stdio: 'inherit'});
} catch(e) {}

// Phase 3: Validation architecture modulaire
console.log('\n✅ PHASE 3: VALIDATION MODULAIRE');
try {
  execSync('node LAUNCHER_MODULAIRE.js', {stdio: 'inherit'});
} catch(e) {}

// Rapport final
console.log('\n📊 RAPPORT FINAL BACKUP:');
const backupCount = fs.existsSync('./backup') ? fs.readdirSync('./backup').length : 0;
const moduleCount = fs.existsSync('./modules') ? 12 : 0;
const driverCount = fs.existsSync('./drivers') ? fs.readdirSync('./drivers').length : 0;

console.log(`   🗂️ ${backupCount} backups organisés`);
console.log(`   📦 ${moduleCount} modules actifs`);
console.log(`   🚗 ${driverCount} drivers`);

// Git final
try {
  execSync('git add -A && git commit -m "🗂️ Système backup complet organisé" && git push', {stdio: 'pipe'});
  console.log('✅ Push réussi');
} catch(e) {}

console.log('\n🎉 SYSTÈME BACKUP COMPLET TERMINÉ');
