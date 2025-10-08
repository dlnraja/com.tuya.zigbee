const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisify les fonctions du filesystem
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);
const access = promisify(fs.access);

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  logFile: path.join(process.cwd(), 'reports-move.log'),
  
  // Dossiers source et destination
  sourceDirs: [
    path.join(process.cwd(), 'reports'),
    path.join(process.cwd(), 'analysis-results')
  ],
  destDir: path.join(process.cwd(), 'reports', 'analysis'),
  
  // Fichiers à ignorer (ne pas déplacer)
  ignoreFiles: [
    'file-organization.log',
    'reports-move.log'
  ]
};

// Logger simple
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.logFile, `${logMessage}\n`);
};

// Créer un répertoire s'il n'existe pas
async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

// Vérifier si un fichier est un rapport à déplacer
function shouldMoveFile(fileName) {
  // Ne pas déplacer les fichiers dans la liste d'ignorés
  if (CONFIG.ignoreFiles.includes(fileName)) {
    return false;
  }
  
  // Vérifier les extensions de fichiers de rapport courantes
  const reportExtensions = [
    '.json', '.md', '.txt', '.log', '.csv',
    '.xlsx', '.xls', '.pdf', '.html', '.htm'
  ];
  
  const ext = path.extname(fileName).toLowerCase();
  return reportExtensions.includes(ext) || 
         fileName.toLowerCase().includes('report') ||
         fileName.toLowerCase().includes('analysis');
}

// Fonction principale
async function moveReports() {
  try {
    log('Début du déplacement des rapports');
    
    // S'assurer que le dossier de destination existe
    await ensureDir(CONFIG.destDir);
    
    // Parcourir chaque dossier source
    for (const sourceDir of CONFIG.sourceDirs) {
      try {
        // Vérifier si le dossier source existe
        await access(sourceDir);
        log(`Traitement du dossier: ${sourceDir}`);
        
        // Lire le contenu du dossier
        const files = await readdir(sourceDir);
        
        // Parcourir chaque fichier
        for (const file of files) {
          try {
            const sourcePath = path.join(sourceDir, file);
            const destPath = path.join(CONFIG.destDir, file);
            
            // Ignorer les dossiers
            const stats = await stat(sourcePath);
            if (stats.isDirectory()) {
              log(`  Ignorer le dossier: ${file}`);
              continue;
            }
            
            // Vérifier si le fichier doit être déplacé
            if (shouldMoveFile(file)) {
              // Vérifier si un fichier avec le même nom existe déjà dans la destination
              let finalDestPath = destPath;
              let counter = 1;
              
              while (fs.existsSync(finalDestPath)) {
                const ext = path.extname(file);
                const name = path.basename(file, ext);
                finalDestPath = path.join(CONFIG.destDir, `${name}_${counter}${ext}`);
                counter++;
              }
              
              // Déplacer le fichier
              await rename(sourcePath, finalDestPath);
              log(`  Déplacé: ${file} -> ${path.relative(CONFIG.projectRoot, finalDestPath)}`);
            } else {
              log(`  Ignoré: ${file} (ne correspond pas aux critères)`);
            }
          } catch (error) {
            log(`  Erreur lors du traitement de ${file}: ${error.message}`);
          }
        }
      } catch (error) {
        log(`Erreur d'accès au dossier ${sourceDir}: ${error.message}`);
      }
    }
    
    log('Déplacement des rapports terminé avec succès');
  } catch (error) {
    log(`ERREUR: ${error.message}`);
    process.exit(1);
  }
}

// Exécuter le script
moveReports().catch(console.error);
