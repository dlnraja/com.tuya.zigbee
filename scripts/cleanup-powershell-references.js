// !/usr/bin/env node

/**
 * Nettoyage des références JavaScript restantes
 * Supprime toutes les mentions de .js et JavaScript
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage des références JavaScript restantes...');

// Fonction de nettoyage des fichiers
function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Remplacements JavaScript → JavaScript
    const replacements = [
      // Fichiers .js
      [/\.js/g, '.js'],
      [/JavaScript/g, 'JavaScript'],
      [/javascript/g, 'javascript'],
      [/JS/g, 'JS'],
      [/js/g, 'js'],
      
      // Commandes JavaScript spécifiques
      [/console.log/g, 'console.log'],
      [/console.log/g, 'console.log'],
      [/new Date()/g, 'new Date()'],
      [/fs.existsSync/g, 'fs.existsSync'],
      [/fs.mkdirSync/g, 'fs.mkdirSync'],
      [/fs.rmSync/g, 'fs.rmSync'],
      [/process.chdir/g, 'process.chdir'],
      [/process.cwd()/g, 'process.cwd()'],
      [/fs.cpSync/g, 'fs.cpSync'],
      [/fs.writeFileSync/g, 'fs.writeFileSync'],
      [/fs.readFileSync/g, 'fs.readFileSync'],
      [/fs.appendFileSync/g, 'fs.appendFileSync'],
      [/content.includes/g, 'content.includes'],
      
      // Variables JavaScript
      [/\process.env.HOME || process.env.USERPROFILE/g, 'process.env.HOME || process.env.USERPROFILE'],
      [/\WORK_DIR/g, 'WORK_DIR'],
      [/\FORK/g, 'FORK'],
      [/\BRANCH/g, 'BRANCH'],
      
      // Syntaxe JavaScript
      [/if\s*\(\s*-not\s*\(/g, 'if (!('],
      [/if\s*\(\s*-not\s*/g, 'if (!'],
      [/try\s*\{/g, 'try {'],
      [/catch\s*\{/g, '} catch (error) {'],
      [/finally\s*\{/g, '} } finally {'],
      
      // Commentaires JavaScript
      [/// \s*([^// \n]+)/g, '// $1'],
      
      // Paramètres JavaScript
      [/param\s*\(/g, '// Configuration:'],
      [/\[string\]\$/g, 'const '],
      [/=\s*"([^"]+)"/g, '  = "$1"'],
      
      // Boucles JavaScript
      [/ForEach-Object\s*\{/g, '.forEach('],
      [/1\.\.(\d+)\s*\|\s*ForEach-Object/g, 'Array.from({length: $1}, (_, i) => i + 1)'],
      
      // Opérateurs JavaScript
      [/\n/g, '\\n'],
      [/\t/g, '\\t'],
      [/\r/g, '\\r']
    ];
    
    replacements.forEach(([pattern, replacement]) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ ${filePath} nettoyé`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn(`⚠️ Erreur lors du nettoyage de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction de scan récursif
function scanDirectory(dirPath, extensions = ['.md', '.txt', '.js', '.json', '.yml', '.yaml']) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  let cleanedCount = 0;
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      // Ignorer les dossiers système
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === '.git') {
        continue;
      }
      cleanedCount += scanDirectory(fullPath, extensions);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (extensions.includes(ext)) {
        if (cleanFile(fullPath)) {
          cleanedCount++;
        }
      }
    }
  }
  
  return cleanedCount;
}

// Fonction principale
function main() {
  const projectRoot = process.cwd();
  console.log(`📍 Dossier racine: ${projectRoot}`);
  
  // Extensions de fichiers à nettoyer
  const extensions = ['.md', '.txt', '.js', '.json', '.yml', '.yaml'];
  
  console.log('🔍 Scan des fichiers pour références JavaScript...');
  const cleanedCount = scanDirectory(projectRoot, extensions);
  
  console.log('\n📊 RÉSULTATS DU NETTOYAGE:');
  console.log('=====================================');
  console.log(`✅ Fichiers nettoyés: ${cleanedCount}`);
  console.log(`🔍 Extensions scannées: ${extensions.join(', ')}`);
  
  if (cleanedCount > 0) {
    console.log('\n🎯 Références JavaScript supprimées avec succès !');
    console.log('💡 Tous les scripts sont maintenant en JavaScript');
  } else {
    console.log('\n✨ Aucune référence JavaScript trouvée !');
    console.log('💡 Le projet est déjà 100% JavaScript');
  }
  
  console.log('\n🚀 Nettoyage terminé !');
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  cleanFile,
  scanDirectory,
  main
};

