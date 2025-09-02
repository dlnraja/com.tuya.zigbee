import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.github',
  'backup',
  'logs',
  'dist',
  'build',
  'coverage',
  'test',
  'tests',
  '__tests__',
  '__mocks__',
  '.vscode',
  '.idea',
  '.homeybuild',
  '.homeycompose'
];

// Fonction pour vérifier si un dossier est vide
function isDirectoryEmpty(dirPath) {
  try {
    return fs.readdirSync(dirPath).length === 0;
  } catch (error) {
    return false;
  }
}

// Fonction pour supprimer un dossier récursivement
function removeEmptyDirs(dirPath, isRoot = true) {
  if (!fs.existsSync(dirPath)) return;
  
  const files = fs.readdirSync(dirPath);
  let fileCount = files.length;
  
  // Parcourir les fichiers et dossiers
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Ignorer les dossiers spéciaux
      if (IGNORE_DIRS.includes(file)) return;
      
      // Supprimer les sous-dossiers vides
      removeEmptyDirs(fullPath, false);
      
      // Vérifier si le dossier est maintenant vide
      if (isDirectoryEmpty(fullPath)) {
        try {
          fs.rmdirSync(fullPath);
          console.log(`Supprimé le dossier vide: ${fullPath}`);
          fileCount--;
        } catch (error) {
          console.error(`Erreur lors de la suppression de ${fullPath}:`, error.message);
        }
      }
    }
  });
  
  // Ne pas supprimer le dossier racine
  if (!isRoot && fileCount === 0) {
    try {
      fs.rmdirSync(dirPath);
      console.log(`Supprimé le dossier vide: ${dirPath}`);
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${dirPath}:`, error.message);
    }
  }
}

// Fonction pour trouver les dossiers de test obsolètes
function findTestFolders(rootDir) {
  const testFolders = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Ignorer les dossiers spéciaux
        if (IGNORE_DIRS.includes(entry.name)) return;
        
        // Vérifier les motifs de noms de dossiers de test
        const isTestFolder = [
          'test', 'tests', 'spec', 'specs', 'e2e', 'integration',
          '__tests__', '__mocks__', 'fixtures', 'mocks'
        ].some(folder => 
          entry.name.toLowerCase().includes(folder) || 
          entry.name.match(/test/i) || 
          entry.name.match(/spec/i)
        );
        
        if (isTestFolder) {
          testFolders.push(fullPath);
        } else {
          // Scanner les sous-dossiers
          scanDirectory(fullPath);
        }
      }
    });
  }
  
  scanDirectory(rootDir);
  return testFolders;
}

// Fonction principale
function main() {
  console.log('Nettoyage des dossiers vides...');
  console.log('-------------------------------');
  
  // Étape 1: Supprimer les dossiers vides
  removeEmptyDirs(ROOT_DIR);
  
  console.log('\nRecherche des dossiers de test obsolètes...');
  console.log('--------------------------------------');
  
  // Étape 2: Trouver les dossiers de test
  const testFolders = findTestFolders(ROOT_DIR);
  
  if (testFolders.length > 0) {
    console.log(`\nTrouvé ${testFolders.length} dossiers de test potentiellement obsolètes:`);
    testFolders.forEach(folder => {
      console.log(`- ${path.relative(ROOT_DIR, folder)}`);
    });
    
    console.log('\nPour supprimer ces dossiers, exécutez la commande suivante:');
    console.log('node scripts/cleanup-empty-folders.js --remove-test-folders');
    
    // Vérifier si l'option --remove-test-folders est activée
    if (process.argv.includes('--remove-test-folders')) {
      console.log('\nSuppression des dossiers de test...');
      let removedCount = 0;
      
      testFolders.forEach(folder => {
        try {
          fs.rmSync(folder, { recursive: true, force: true });
          console.log(`✓ Supprimé: ${path.relative(ROOT_DIR, folder)}`);
          removedCount++;
        } catch (error) {
          console.error(`✗ Erreur lors de la suppression de ${folder}:`, error.message);
        }
      });
      
      console.log(`\n${removedCount} dossiers de test supprimés avec succès.`);
    }
  } else {
    console.log('Aucun dossier de test obsolète trouvé.');
  }
}

// Exécuter le script
main();
