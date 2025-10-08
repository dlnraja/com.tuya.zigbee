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
  
  // Fichiers à garder à la racine (essentiels pour Homey)
  keepInRoot: [
    // Fichiers de configuration
    '.env', '.gitignore', '.homeyignore', '.homeyplugins.json',
    'app.json', 'app.js', 'app.d.ts', 'app.d.ts.map',
    'package.json', 'package-lock.json', 'tsconfig.json',
    '.babelrc', '.eslintrc.js', '.eslintrc.json', '.mocharc.json',
    '.nycrc.json', '.prettierrc', 'jest.config.js', 'nodemon.json',
    
    // Documentation
    'README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'AUTHORS',
    
    // Configuration projet
    '.tuya-config.json', 'sdk-config.json', 'sdk3-config.json',
    'ai-config.json', 'mega-prompt-config.json',
    
    // Rapports
    'MEGA_ENHANCEMENT_ULTIMATE_COMPLETE_REPORT.md', 'FINAL_REPORT.md',
    'DRIVER_COVERAGE_ANALYSIS_REPORT.md', 'DRIVERS_STATUS_REPORT.md',
    
    // Scripts principaux
    'ultimate-project.js', 'mega-restructure-ultimate-v2.sh',
    'mega-restructure-ultimate.sh', 'ultimateproject.sh'
  ]
};

// Logger
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    this.logStream.write(logMessage);
    console.log(logMessage.trim());
  }

  close() {
    this.logStream.end();
  }
}

// Créer une instance du logger
const logger = new Logger(CONFIG.logFile);

// Fonction principale
async function organizeFiles() {
  try {
    logger.log('Début de l\'organisation des fichiers');
    
    // Lire le contenu du répertoire racine
    const files = await readdir(CONFIG.projectRoot);
    
    // Créer les dossiers nécessaires
    await mkdir(path.join(CONFIG.projectRoot, 'config'), { recursive: true });
    await mkdir(path.join(CONFIG.projectRoot, 'reports', 'analysis'), { recursive: true });
    await mkdir(path.join(CONFIG.projectRoot, 'scripts', 'utilities'), { recursive: true });
    
    for (const file of files) {
      // Ignorer les dossiers
      const stats = await stat(path.join(CONFIG.projectRoot, file));
      if (stats.isDirectory()) continue;
      
      // Vérifier si le fichier doit rester à la racine
      if (CONFIG.keepInRoot.includes(file)) {
        logger.log(`Conservé à la racine: ${file}`);
        continue;
      }
      
      // Déplacer les fichiers de configuration
      if (file.endsWith('.json') || file.startsWith('.eslint') || file.startsWith('.mocharc') || 
          file.startsWith('.nycrc') || file === '.babelrc' || file === '.prettierrc' || 
          file === 'jest.config.js' || file === 'nodemon.json') {
        const dest = path.join(CONFIG.projectRoot, 'config', file);
        await rename(path.join(CONFIG.projectRoot, file), dest);
        logger.log(`Déplacé vers config/: ${file}`);
      }
      // Déplacer les fichiers de rapport
      else if (file.includes('REPORT') || file.endsWith('.log') || file.endsWith('.txt')) {
        const dest = path.join(CONFIG.projectRoot, 'reports', 'analysis', file);
        await rename(path.join(CONFIG.projectRoot, file), dest);
        logger.log(`Déplacé vers reports/analysis/: ${file}`);
      }
      // Déplacer les scripts utilitaires
      else if (file.endsWith('.js') || file.endsWith('.bat') || file.endsWith('.cmd') || file.endsWith('.ps1')) {
        const dest = path.join(CONFIG.projectRoot, 'scripts', 'utilities', file);
        await rename(path.join(CONFIG.projectRoot, file), dest);
        logger.log(`Déplacé vers scripts/utilities/: ${file}`);
      }
    }
    
    logger.log('Organisation des fichiers terminée avec succès', 'SUCCESS');
  } catch (error) {
    logger.log(`Erreur lors de l'organisation des fichiers: ${error.message}`, 'ERROR');
    throw error;
  } finally {
    logger.close();
  }
}

// Exécuter le script
organizeFiles().catch(console.error);
