const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE FINAL - PROJET HOMEY PROPRE\n');
console.log('='.repeat(60) + '\n');

// Fichiers essentiels HOMEY à garder
const keepFiles = [
  // Homey essentials
  'app.json',
  'package.json',
  'package-lock.json',
  '.homeyignore',
  '.homeychangelog.json',
  '.homeychangelog.json.backup',
  
  // Git
  '.gitignore',
  '.gitattributes',
  
  // Documentation
  'README.md',
  'README.txt',
  'LICENSE',
  'CHANGELOG.md',
  
  // Config
  '.env',
  '.env.example',
  '.prettierrc',
  '.prettierignore',
  '.publish-trigger',
  '.trigger-validation',
  
  // Scripts utiles
  'push-native.js',
  'FINAL_CLEANUP.js'
];

// Fichiers temporaires à supprimer (patterns)
const tempPatterns = [
  /^[a-z]\.js$/,           // p.js, y.js, z.js
  /^fix.*\.js$/i,          // fix.js, fix_push.js
  /^check.*\.js$/i,        // check_*.js
  /^clean.*\.js$/i,        // clean.js, cleanup_*.js
  /^commit.*\.js$/i,       // commit_*.js
  /^copy.*\.js$/i,         // copy_*.js
  /^create.*\.js$/i,       // create_*.js (non essentiels)
  /^push.*\.js$/i,         // push_*.js (sauf push-native.js)
  /^verify.*\.js$/i,       // verify*.js
  /^make.*\.js$/i,         // make_*.js
  /^force.*\.js$/i,        // force_*.js
  /^final.*\.js$/i,        // final_*.js (sauf FINAL_CLEANUP.js)
  /.*\.sh$/,               // tous .sh
  /.*\.cmd$/,              // tous .cmd
  /.*\.bat$/,              // tous .bat
  /.*\.ps1$/               // tous .ps1
];

const rootFiles = fs.readdirSync(__dirname);
const toDelete = [];

for (const file of rootFiles) {
  const fullPath = path.join(__dirname, file);
  const stat = fs.statSync(fullPath);
  
  // Skip directories
  if (stat.isDirectory()) continue;
  
  // Garder fichiers essentiels
  if (keepFiles.includes(file)) continue;
  
  // Vérifier si correspond aux patterns temporaires
  const isTemp = tempPatterns.some(pattern => pattern.test(file));
  if (isTemp) {
    toDelete.push(file);
  }
}

console.log(`📦 Fichiers analysés: ${rootFiles.filter(f => !fs.statSync(f).isDirectory()).length}`);
console.log(`✅ Fichiers essentiels: ${keepFiles.length}`);
console.log(`🗑️  Fichiers temporaires: ${toDelete.length}\n`);

if (toDelete.length > 0) {
  console.log('🗑️  SUPPRESSION:\n');
  
  // Créer archive
  const archivePath = path.join(__dirname, '.archive', 'temp-files');
  fs.mkdirSync(archivePath, { recursive: true });
  
  let moved = 0;
  for (const file of toDelete) {
    try {
      const source = path.join(__dirname, file);
      const dest = path.join(archivePath, file);
      fs.renameSync(source, dest);
      console.log(`   ✓ ${file}`);
      moved++;
    } catch (err) {
      console.error(`   ✗ ${file}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ ${moved} fichiers archivés dans .archive/temp-files/\n`);
}

console.log('='.repeat(60));
console.log('✅ PROJET HOMEY PROPRE ET ORGANISÉ!\n');
console.log('📂 Structure finale:');
console.log('   - Homey essentials (app.json, package.json, etc.)');
console.log('   - drivers/ (183 drivers avec images)');
console.log('   - assets/ (APP images)');
console.log('   - Documentation (README, LICENSE)');
console.log('   - Scripts utiles (push-native.js)');
console.log('   - Archives (.archive/)');
console.log();
