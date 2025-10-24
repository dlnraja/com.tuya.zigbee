const fs = require('fs');
const path = require('path');

console.log('🔄 MISE À JOUR TOUS LES SCRIPTS - NOUVEAUX NOMS DRIVERS');
console.log('═'.repeat(80));

// Charger le mapping
const mapping = JSON.parse(fs.readFileSync('./HARMONIZE_MAPPING_APPLIED.json', 'utf8'));

// Créer dictionnaire
const renameDict = {};
mapping.forEach(m => {
  renameDict[m.old] = m.new;
});

console.log(`\n📋 Mise à jour avec ${Object.keys(renameDict).length} renommages...\n`);

// Fonction pour mettre à jour un fichier
const updateFile = (filePath) => {
  if (!fs.existsSync(filePath)) return 0;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  Object.entries(renameDict).forEach(([oldName, newName]) => {
    const regex = new RegExp(oldName, 'g');
    if (regex.test(content)) {
      content = String(content).replace(regex, newName);
      changes++;
    }
  });
  
  if (changes > 0) {
    fs.writeFileSync(filePath, content);
  }
  
  return changes;
};

// Scanner récursivement les dossiers de scripts
const scanDirectory = (dir, extensions = ['.js', '.json', '.md']) => {
  const results = [];
  
  const scan = (currentDir) => {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stats.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    });
  };
  
  scan(dir);
  return results;
};

// Dossiers à scanner
const foldersToScan = [
  './scripts',
  './docs',
  './reports'
];

let totalFiles = 0;
let totalChanges = 0;

foldersToScan.forEach(folder => {
  if (!fs.existsSync(folder)) {
    console.log(`   ⏭️  ${folder} n'existe pas, skip`);
    return;
  }
  
  console.log(`\n📁 ${folder}/`);
  
  const files = scanDirectory(folder);
  
  files.forEach(file => {
    const changes = updateFile(file);
    if (changes > 0) {
      const relativePath = path.relative('.', file);
      console.log(`   ✅ ${relativePath} (${changes} références)`);
      totalFiles++;
      totalChanges += changes;
    }
  });
});

// Mettre à jour les fichiers racine
console.log('\n📄 Fichiers racine:');

const rootFiles = [
  'README.md',
  'CHANGELOG.md',
  'INTELLIGENT_RENAME_COMPLETE.md',
  'PROJECT_ORGANIZATION_COMPLETE.md'
];

rootFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const changes = updateFile(file);
    if (changes > 0) {
      console.log(`   ✅ ${file} (${changes} références)`);
      totalFiles++;
      totalChanges += changes;
    }
  }
});

console.log('\n═'.repeat(80));
console.log('📊 RÉSUMÉ MISE À JOUR');
console.log('═'.repeat(80));

console.log(`\n✅ Fichiers mis à jour: ${totalFiles}`);
console.log(`✅ Références changées: ${totalChanges}`);

console.log('\n✅ TOUS LES SCRIPTS MIS À JOUR !');
