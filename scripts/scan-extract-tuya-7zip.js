'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');

// Configuration de scan et extraction
const SCAN_CONFIG = {
  ROOT: process.cwd(),
  TMP: path.join(process.cwd(), '.tmp_tuya_zip_work'),
  
  // Chemins à scanner
  SCAN_PATHS: [
    'C:\\',
    'D:\\',
    path.join(process.env.USERPROFILE || '', 'Desktop'),
    path.join(process.env.USERPROFILE || '', 'Downloads'),
    path.join(process.env.USERPROFILE || '', 'Documents'),
    process.cwd() // Repo actuel
  ],
  
  // Patterns de fichiers à rechercher
  FILE_PATTERNS: [
    '*tuya*.zip',
    '*zigbee*.zip',
    '*smart_life*.zip',
    '*life_smart*.zip',
    '*_tz*.zip',
    '*_ty*.zip'
  ]
};

function log(msg, level = 'INFO') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[SCAN-EXTRACT-7ZIP] [${timestamp}]`;
  console.log(`${prefix} ${level}: ${msg}`);
}

function run(cmd, args, options = {}) {
  const defaultOptions = { stdio: 'pipe', shell: process.platform === 'win32' };
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const result = spawnSync(cmd, args, finalOptions);
    return { success: result.status === 0, code: result.status, output: result.stdout, error: result.stderr };
  } catch (e) {
    return { success: false, code: -1, output: '', error: e.message };
  }
}

// Fonction pour vérifier si 7zip est disponible
function check7zip() {
  log('🔍 Vérification de 7zip...');
  
  // Essayer 7z
  const sevenZipCheck = run('7z', ['--version']);
  if (sevenZipCheck.success) {
    log('✅ 7zip (7z) disponible');
    return '7z';
  }
  
  // Essayer 7za
  const sevenZaCheck = run('7za', ['--version']);
  if (sevenZaCheck.success) {
    log('✅ 7zip (7za) disponible');
    return '7za';
  }
  
  log('❌ 7zip non disponible', 'ERROR');
  return null;
}

// Fonction pour scanner un répertoire récursivement
function scanDirectory(dirPath, maxDepth = 3, currentDepth = 0) {
  const foundFiles = [];
  
  if (currentDepth >= maxDepth) return foundFiles;
  
  try {
    if (!fs.existsSync(dirPath)) return foundFiles;
    
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item.name);
      
      try {
        if (item.isDirectory()) {
          // Éviter les dossiers système et temporaires
          if (!item.name.startsWith('.') && 
              !item.name.startsWith('$') && 
              !['System Volume Information', 'Recovery', 'Windows', 'Program Files', 'Program Files (x86)'].includes(item.name)) {
            const subFiles = scanDirectory(itemPath, maxDepth, currentDepth + 1);
            foundFiles.push(...subFiles);
          }
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.zip')) {
          // Vérifier si le fichier correspond aux patterns
          const fileName = item.name.toLowerCase();
          if (SCAN_CONFIG.FILE_PATTERNS.some(pattern => {
            const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
            return new RegExp(regexPattern, 'i').test(fileName);
          })) {
            foundFiles.push({
              path: itemPath,
              name: item.name,
              size: fs.statSync(itemPath).size,
              source: dirPath
            });
          }
        }
      } catch (e) {
        // Ignorer les erreurs d'accès
        continue;
      }
    }
  } catch (e) {
    // Ignorer les erreurs d'accès
  }
  
  return foundFiles;
}

// Fonction pour extraire un ZIP avec 7zip
async function extractZip(zipPath, extractPath, sevenZipCmd) {
  const fileName = path.basename(zipPath);
  log(`📦 Extraction: ${fileName}`);
  
  try {
    // Créer le dossier de destination
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // Extraire avec 7zip
    const args = sevenZipCmd === '7z' ? ['x', zipPath, '-o' + extractPath, '-y'] : ['x', zipPath, '-o' + extractPath, '-y'];
    const result = run(sevenZipCmd, args);
    
    if (result.success) {
      log(`✅ Extraction réussie: ${fileName}`);
      return true;
    } else {
      log(`❌ Extraction échouée: ${fileName} - ${result.error}`, 'ERROR');
      return false;
    }
  } catch (e) {
    log(`❌ Erreur extraction ${fileName}: ${e.message}`, 'ERROR');
    return false;
  }
}

// Fonction pour analyser le contenu extrait
function analyzeExtractedContent(extractPath) {
  log(`🔍 Analyse du contenu extrait: ${path.basename(extractPath)}`);
  
  const analysis = {
    path: extractPath,
    name: path.basename(extractPath),
    hasDriverJson: false,
    hasDriverCompose: false,
    hasAssets: false,
    hasCode: false,
    files: [],
    directories: []
  };
  
  try {
    const items = fs.readdirSync(extractPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(extractPath, item.name);
      
      if (item.isDirectory()) {
        analysis.directories.push(item.name);
        
        // Vérifier les sous-dossiers
        try {
          const subItems = fs.readdirSync(itemPath, { withFileTypes: true });
          for (const subItem of subItems) {
            if (subItem.name === 'driver.json') analysis.hasDriverJson = true;
            if (subItem.name === 'driver.compose.json') analysis.hasDriverCompose = true;
            if (subItem.name === 'assets') analysis.hasAssets = true;
            if (subItem.name === 'code' || subItem.name === 'lib' || subItem.name === 'src') analysis.hasCode = true;
          }
        } catch (e) {
          // Ignorer les erreurs d'accès
        }
      } else {
        analysis.files.push(item.name);
        if (item.name === 'driver.json') analysis.hasDriverJson = true;
        if (item.name === 'driver.compose.json') analysis.hasDriverCompose = true;
      }
    }
  } catch (e) {
    log(`⚠️  Erreur analyse ${path.basename(extractPath)}: ${e.message}`, 'WARN');
  }
  
  return analysis;
}

// Fonction pour traiter les fichiers trouvés
async function processFoundFiles(foundFiles, sevenZipCmd) {
  log(`📊 Traitement de ${foundFiles.length} fichiers trouvés...`);
  
  const results = {
    total: foundFiles.length,
    extracted: 0,
    failed: 0,
    analyses: []
  };
  
  for (const file of foundFiles) {
    log(`🔄 Traitement: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Créer un dossier unique pour l'extraction
    const extractDirName = `${path.parse(file.name).name}_${Date.now()}`;
    const extractPath = path.join(SCAN_CONFIG.TMP, extractDirName);
    
    // Extraire le ZIP
    const extractSuccess = await extractZip(file.path, extractPath, sevenZipCmd);
    
    if (extractSuccess) {
      results.extracted++;
      
      // Analyser le contenu extrait
      const analysis = analyzeExtractedContent(extractPath);
      results.analyses.push(analysis);
      
      log(`📋 Analyse: ${analysis.name} - Driver: ${analysis.hasDriverJson || analysis.hasDriverCompose}, Assets: ${analysis.hasAssets}, Code: ${analysis.hasCode}`);
    } else {
      results.failed++;
    }
  }
  
  return results;
}

// Fonction principale
async function main() {
  log('🚀 DÉMARRAGE DU SCAN ET EXTRACTION 7ZIP TUYA');
  
  // Vérifier 7zip
  const sevenZipCmd = check7zip();
  if (!sevenZipCmd) {
    log('❌ Impossible de continuer sans 7zip', 'ERROR');
    return false;
  }
  
  // Créer le dossier temporaire
  if (!fs.existsSync(SCAN_CONFIG.TMP)) {
    fs.mkdirSync(SCAN_CONFIG.TMP, { recursive: true });
    log(`📁 Dossier temporaire créé: ${SCAN_CONFIG.TMP}`);
  }
  
  // Scanner les chemins
  const allFoundFiles = [];
  for (const scanPath of SCAN_CONFIG.SCAN_PATHS) {
    if (fs.existsSync(scanPath)) {
      log(`🔍 Scan de: ${scanPath}`);
      const foundFiles = scanDirectory(scanPath, 3);
      allFoundFiles.push(...foundFiles);
      log(`📁 Trouvé ${foundFiles.length} fichiers dans: ${scanPath}`);
    } else {
      log(`⚠️  Chemin non accessible: ${scanPath}`, 'WARN');
    }
  }
  
  // Filtrer les doublons (même nom et taille)
  const uniqueFiles = [];
  const seen = new Set();
  
  for (const file of allFoundFiles) {
    const key = `${file.name}_${file.size}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }
  
  log(`📊 Total fichiers uniques trouvés: ${uniqueFiles.length}`);
  
  if (uniqueFiles.length === 0) {
    log('ℹ️  Aucun fichier ZIP Tuya trouvé');
    return true;
  }
  
  // Traiter les fichiers
  const results = await processFoundFiles(uniqueFiles, sevenZipCmd);
  
  // Rapport final
  log('📊 RAPPORT FINAL DU SCAN ET EXTRACTION');
  log(`📦 Total: ${results.total}`);
  log(`✅ Extrait: ${results.extracted}`);
  log(`❌ Échoué: ${results.failed}`);
  
  // Analyser les résultats
  const validDrivers = results.analyses.filter(a => a.hasDriverJson || a.hasDriverCompose);
  const withAssets = results.analyses.filter(a => a.hasAssets);
  const withCode = results.analyses.filter(a => a.hasCode);
  
  log(`🔧 Drivers valides: ${validDrivers.length}`);
  log(`🎨 Avec assets: ${withAssets.length}`);
  log(`💻 Avec code: ${withCode.length}`);
  
  log('🎉 SCAN ET EXTRACTION 7ZIP TERMINÉ AVEC SUCCÈS !');
  return true;
}

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ PROMISE REJECTION: ${reason}`, 'ERROR');
});

process.on('uncaughtException', (error) => {
  log(`❌ UNCAUGHT EXCEPTION: ${error.message}`, 'ERROR');
  process.exit(1);
});

// EXÉCUTION
if (require.main === module) {
  main().catch(e => {
    log(`❌ ERREUR FATALE: ${e.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { scanDirectory, extractZip, analyzeExtractedContent };
