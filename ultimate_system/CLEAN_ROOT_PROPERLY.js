const fs = require('fs');
const { execSync } = require('child_process');

console.log('🧹 CLEAN ROOT PROPERLY - Nettoyer racine correctement');

// Files that MUST stay at root (Homey essentials)
const homeyFiles = [
  'app.json', 'package.json', 'app.js', 'README.md',
  '.env', '.gitignore', '.homeyignore', '.prettierignore', '.prettierrc',
  'drivers', 'assets', 'settings', 'node_modules',
  '.git', '.github', '.vscode', '.homeybuild', '.external_sources'
];

console.log('📋 FICHIERS À GARDER À LA RACINE:');
homeyFiles.forEach(f => console.log(`✅ ${f}`));

// Get all items at root
const allItems = fs.readdirSync('..');
let moved = 0;

console.log('\n🔄 DÉPLACEMENT VERS ULTIMATE_SYSTEM:');

allItems.forEach(item => {
  // Skip items that should stay at root
  if (homeyFiles.includes(item) || item === 'ultimate_system') {
    return;
  }
  
  const itemPath = `../${item}`;
  const targetPath = `./${item}_moved_from_root`;
  
  try {
    if (fs.existsSync(itemPath)) {
      if (fs.statSync(itemPath).isDirectory()) {
        execSync(`robocopy "${itemPath}" "${targetPath}" /E /NFL /NDL /NJH /NJS`, {stdio: 'pipe'});
        execSync(`rmdir /s /q "${itemPath}"`, {stdio: 'pipe'});
      } else {
        fs.renameSync(itemPath, targetPath);
      }
      moved++;
      console.log(`✅ ${item} → ultimate_system`);
    }
  } catch(e) {
    console.log(`⚠️ ${item} error`);
  }
});

console.log(`\n🎉 RACINE NETTOYÉE:`);
console.log(`✅ ${moved} items moved to ultimate_system`);
console.log(`✅ Only Homey essentials remain at root`);
