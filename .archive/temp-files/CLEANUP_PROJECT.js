const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE PROJET - FICHIERS TEMPORAIRES\n');
console.log('='.repeat(60) + '\n');

// Fichiers essentiels Homey à garder
const keepPatterns = [
  'app.json',
  'package.json',
  'package-lock.json',
  '.homeyignore',
  '.homeychangelog.json',
  'README.md',
  'LICENSE',
  '.gitignore',
  'drivers/',
  'assets/',
  'locales/',
  'node_modules/',
  '.git/',
  'references/',
  'project-data/',
  '.github/'
];

// Extensions à supprimer
const deleteExtensions = [
  '.sh',
  '.cmd',
  '.bat',
  '.ps1'
];

// Patterns de noms à supprimer
const deletePatterns = [
  /^[A-Z_]+\.cmd$/,
  /^[a-z]+\.sh$/,
  /^[A-Z]\.cmd$/,
  /^commit.*\.(cmd|sh|ps1)$/i,
  /^push.*\.(cmd|sh|ps1)$/i,
  /^final.*\.(cmd|sh|ps1)$/i,
  /^fix.*\.(cmd|sh)$/i,
  /^restore.*\.(cmd|sh)$/i,
  /^complete.*\.(cmd|sh)$/i,
  /^add.*\.(js|cmd)$/i,
  /^remove.*\.js$/i,
  /^create.*\.js$/i,
  /^delete.*\.js$/i,
  /^recreate.*\.js$/i,
  /^regenerate.*\.js$/i
];

// Scripts utiles à garder
const keepScripts = [
  'ULTIMATE_FIX_ALL.js',
  'CLEANUP_PROJECT.js'
];

const rootFiles = fs.readdirSync(__dirname);
const toDelete = [];
const toKeep = [];

for (const file of rootFiles) {
  const fullPath = path.join(__dirname, file);
  const stat = fs.statSync(fullPath);
  
  // Skip directories
  if (stat.isDirectory()) continue;
  
  // Toujours garder les scripts utiles
  if (keepScripts.includes(file)) {
    toKeep.push(file);
    continue;
  }
  
  // Vérifier extensions
  const ext = path.extname(file);
  if (deleteExtensions.includes(ext)) {
    toDelete.push(file);
    continue;
  }
  
  // Vérifier patterns
  const shouldDelete = deletePatterns.some(pattern => pattern.test(file));
  if (shouldDelete) {
    toDelete.push(file);
  } else {
    toKeep.push(file);
  }
}

console.log(`📦 Fichiers analysés: ${rootFiles.length}\n`);
console.log(`✅ À garder: ${toKeep.length}`);
console.log(`🗑️  À supprimer: ${toDelete.length}\n`);

// Afficher ce qui va être supprimé
if (toDelete.length > 0) {
  console.log('🗑️  FICHIERS À SUPPRIMER:\n');
  toDelete.forEach(f => console.log(`   - ${f}`));
  console.log();
}

// Créer dossier archive si nécessaire
const archivePath = path.join(__dirname, '.archive', 'temp-scripts');
fs.mkdirSync(archivePath, { recursive: true });

// Déplacer (pas supprimer) dans archive
let moved = 0;
for (const file of toDelete) {
  try {
    const source = path.join(__dirname, file);
    const dest = path.join(archivePath, file);
    fs.renameSync(source, dest);
    moved++;
  } catch (err) {
    console.error(`   ✗ Erreur: ${file}`);
  }
}

console.log(`✅ ${moved} fichiers déplacés vers .archive/temp-scripts/\n`);
console.log('='.repeat(60));
console.log('✅ NETTOYAGE TERMINÉ - PROJET PROPRE!\n');
