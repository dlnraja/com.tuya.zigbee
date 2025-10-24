const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE & RENOMMAGE INTELLIGENT DES DRIVERS');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
const driversDir = './drivers';

// Patterns à détecter dans les noms de dossiers
const PATTERNS_TO_REMOVE = [
  /ts\d+[a-z]?/gi,           // TS0001, TS011F, etc.
  /_tz[a-z]?\d+_\w+/gi,      // _TZ3000_abc, _TZE284_xyz
  /sq\d+[a-z]+/gi,           // SQ510A, etc.
  /zg-?\d+[a-z]*/gi,         // ZG-204Z, etc.
  /\d{4}[a-z]\d+[a-z]+/gi,   // 1w2k9dd, etc.
  /v\d+[a-z]\d+[a-z]\d+/gi,  // v1w2k9dd, etc.
];

const renameMappings = [];
let totalDrivers = appJson.drivers.length;

console.log(`\n📋 Analyse de ${totalDrivers} drivers...\n`);

// Analyser chaque driver
appJson.drivers.forEach((driver, index) => {
  const driverId = driver.id;
  const driverPath = path.join(driversDir, driverId);
  
  // Vérifier si le nom contient des patterns à supprimer
  let hasPattern = false;
  let cleanName = driverId;
  
  PATTERNS_TO_REMOVE.forEach(pattern => {
    if (pattern.test(cleanName)) {
      hasPattern = true;
      cleanName = cleanName.replace(pattern, '').replace(/_+/g, '_').replace(/^_|_$/g, '');
    }
  });
  
  if (hasPattern && cleanName !== driverId) {
    // Vérifier si le nom nettoyé existe déjà
    const cleanPath = path.join(driversDir, cleanName);
    
    if (fs.existsSync(cleanPath)) {
      // Le dossier propre existe déjà - fusion nécessaire
      console.log(`   🔀 FUSION: ${driverId} → ${cleanName} (existe déjà)`);
      renameMappings.push({
        old: driverId,
        new: cleanName,
        action: 'merge',
        reason: 'clean_name_exists'
      });
    } else {
      // Renommage simple
      console.log(`   📝 RENAME: ${driverId} → ${cleanName}`);
      renameMappings.push({
        old: driverId,
        new: cleanName,
        action: 'rename',
        reason: 'remove_id_pattern'
      });
    }
  }
  
  if ((index + 1) % 20 === 0) {
    console.log(`   Progress: ${index + 1}/${totalDrivers}...`);
  }
});

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ ANALYSE');
console.log('═'.repeat(80));

const renameCount = renameMappings.filter(m => m.action === 'rename').length;
const mergeCount = renameMappings.filter(m => m.action === 'merge').length;

console.log(`\n✅ Drivers à renommer: ${renameCount}`);
console.log(`✅ Drivers à fusionner: ${mergeCount}`);
console.log(`✅ Total changements: ${renameMappings.length}`);

if (renameMappings.length > 0) {
  console.log('\n📋 LISTE COMPLÈTE DES CHANGEMENTS:\n');
  
  renameMappings.forEach(mapping => {
    const icon = mapping.action === 'merge' ? '🔀' : '📝';
    console.log(`   ${icon} ${mapping.old}`);
    console.log(`      → ${mapping.new} (${mapping.action})`);
  });
  
  // Sauvegarder le mapping
  fs.writeFileSync('./DRIVER_RENAME_MAPPING.json', JSON.stringify(renameMappings, null, 2));
  console.log('\n📝 Mapping sauvegardé: DRIVER_RENAME_MAPPING.json');
}

console.log('\n🚀 PROCHAINES ÉTAPES:');
console.log('   1. Appliquer les renommages: node APPLY_DRIVER_RENAMES.js');
console.log('   2. Mettre à jour app.json automatiquement');
console.log('   3. Valider: homey app validate');
console.log('   4. Commit & Push');

console.log('\n✅ ANALYSE TERMINÉE !');
