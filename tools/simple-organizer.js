const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify les fonctions du filesystem
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  logFile: path.join(process.cwd(), 'file-organization.log'),
  
  // Fichiers à garder à la racine
  keepInRoot: [
    // Fichiers de configuration
    '.env', '.gitignore', '.homeyignore', 'app.json', 'app.js',
    'package.json', 'tsconfig.json', 'jest.config.js', 'nodemon.json',
    // Documentation
    'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE'
  ]
};

// Logger simple
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(CONFIG.logFile, `[${timestamp}] ${message}\n`);
};

// Créer un répertoire s'il n'existe pas
async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Fonction principale
async function organizeFiles() {
  try {
    log('Début de l\'organisation des fichiers');
    
    // Créer les dossiers nécessaires
    await ensureDir(path.join(CONFIG.projectRoot, 'config'));
    await ensureDir(path.join(CONFIG.projectRoot, 'reports'));
    await ensureDir(path.join(CONFIG.projectRoot, 'scripts'));
    
    // Lire le contenu du répertoire racine
    const files = await readdir(CONFIG.projectRoot);
    
    for (const file of files) {
      const filePath = path.join(CONFIG.projectRoot, file);
      const stats = await stat(filePath);
      
      // Ignorer les dossiers
      if (stats.isDirectory()) continue;
      
      // Ignorer les fichiers à garder à la racine
      if (CONFIG.keepInRoot.includes(file)) {
        log(`Conservé à la racine: ${file}`);
        continue;
      }
      
      // Déplacer les fichiers de configuration
      if (file.endsWith('.json') || file.startsWith('.')) {
        const dest = path.join(CONFIG.projectRoot, 'config', file);
        await rename(filePath, dest);
        log(`Déplacé vers config/: ${file}`);
      }
      // Déplacer les scripts
      else if (file.endsWith('.js') || file.endsWith('.bat') || file.endsWith('.sh')) {
        const dest = path.join(CONFIG.projectRoot, 'scripts', file);
        await rename(filePath, dest);
        log(`Déplacé vers scripts/: ${file}`);
      }
    }
    
    log('Organisation des fichiers terminée avec succès');
  } catch (error) {
    log(`ERREUR: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter le script
organizeFiles().catch(console.error);
