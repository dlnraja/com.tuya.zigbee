const fs = require('fs');

console.log('✅ BACKUP VALIDATOR');

let valid = 0, invalid = 0;

if (fs.existsSync('./backup')) {
  const backups = fs.readdirSync('./backup');
  
  backups.forEach(backup => {
    // Vérifier format: branche_hash
    if (backup.match(/^[a-z]+_[a-f0-9]{8}$/)) {
      const versionFile = `./backup/${backup}/version_info.json`;
      
      if (fs.existsSync(versionFile)) {
        try {
          const info = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
          if (info.branch && info.commitHash) {
            valid++;
          } else {
            invalid++;
          }
        } catch(e) {
          invalid++;
        }
      } else {
        invalid++;
      }
    } else {
      invalid++;
    }
  });
}

console.log(`✅ ${valid} backups valides`);
console.log(`❌ ${invalid} backups invalides`);

// Validation modules
const moduleFiles = [
  './modules/backup/backup_enricher.js',
  './modules/utils/git_helper.js',
  './modules/zigbee/enricher.js'
];

let modulesOK = 0;
moduleFiles.forEach(file => {
  if (fs.existsSync(file)) modulesOK++;
});

console.log(`📦 ${modulesOK}/${moduleFiles.length} modules backup OK`);

const isValid = valid > 0 && modulesOK === moduleFiles.length;
console.log(`🎯 Système backup: ${isValid ? 'VALIDE' : 'INVALIDE'}`);

// Sauvegarder résultat
const result = {
  validBackups: valid,
  invalidBackups: invalid,
  modulesOK,
  totalModules: moduleFiles.length,
  systemValid: isValid,
  timestamp: new Date().toISOString()
};

if (!fs.existsSync('./references')) fs.mkdirSync('./references');
fs.writeFileSync('./references/backup_validation.json', JSON.stringify(result, null, 2));

console.log('📋 Validation sauvée: references/backup_validation.json');
