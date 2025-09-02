import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const SCRIPT_DIR = path.join(ROOT_DIR, 'scripts');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup', 'scripts-cleanup');

// Patterns de fichiers à supprimer
const PATTERNS_TO_REMOVE = [
  // Fichiers de test et temporaires
  /^test-.*\.js$/,
  /^temp-.*\.js$/,
  /^debug-.*\.js$/,
  
  // Fichiers en double avec numérotation
  /^ai-ext-script-\d+\s*\.js$/,
  /^ai-lot3-\d+\s*\.js$/,
  /^ai-script-lot2-\d+\s*\.js$/,
  
  // Fichiers obsolètes
  /^old-.*\.js$/,
  /^backup-.*\.js$/,
  /^deprecated-.*\.js$/,
];

// Créer le dossier de sauvegarde si nécessaire
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Fonction pour déplacer un fichier vers la sauvegarde
function backupFile(filePath) {
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, fileName);
  
  // Si le fichier de sauvegarde existe déjà, ajouter un suffixe numérique
  let counter = 1;
  let newBackupPath = backupPath;
  while (fs.existsSync(newBackupPath)) {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    newBackupPath = path.join(BACKUP_DIR, `${baseName}_${counter}${ext}`);
    counter++;
  }
  
  fs.renameSync(filePath, newBackupPath);
  return newBackupPath;
}

// Nettoyer les fichiers
function cleanScripts() {
  const files = fs.readdirSync(SCRIPT_DIR);
  let removedCount = 0;
  let keptCount = 0;
  
  console.log('Début du nettoyage des scripts...');
  console.log('--------------------------------');
  
  files.forEach(file => {
    const filePath = path.join(SCRIPT_DIR, file);
    const stat = fs.statSync(filePath);
    
    if (!stat.isFile() || !file.endsWith('.js')) {
      keptCount++;
      return;
    }
    
    // Vérifier si le fichier correspond à un motif à supprimer
    const shouldRemove = PATTERNS_TO_REMOVE.some(pattern => pattern.test(file));
    
    if (shouldRemove) {
      try {
        const backupPath = backupFile(filePath);
        console.log(`[SUPPRIMÉ] ${file} (sauvegardé dans ${backupPath})`);
        removedCount++;
      } catch (error) {
        console.error(`[ERREUR] Impossible de supprimer ${file}:`, error.message);
      }
    } else {
      keptCount++;
    }
  });
  
  console.log('--------------------------------');
  console.log('Nettoyage terminé !');
  console.log(`- Fichiers supprimés: ${removedCount}`);
  console.log(`- Fichiers conservés: ${keptCount}`);
  console.log(`- Sauvegarde disponible dans: ${BACKUP_DIR}`);
}

// Exécuter le nettoyage
cleanScripts();
