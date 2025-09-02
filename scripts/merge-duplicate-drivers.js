import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const BACKUP_DIR = path.join(ROOT_DIR, 'backup', 'drivers-merge');

// Créer le dossier de sauvegarde si nécessaire
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Fonction pour lire un fichier JSON
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error.message);
    return null;
  }
}

// Fonction pour sauvegarder un fichier
function backupFile(filePath) {
  const fileName = path.basename(filePath);
  const backupPath = path.join(BACKUP_DIR, fileName);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const driverFile = path.join(driverPath, 'driver.js');
  const deviceFile = path.join(driverPath, 'device.js');
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  // Vérifier les fichiers existants
  const hasDriver = fs.existsSync(driverFile);
  const hasDevice = fs.existsSync(deviceFile);
  const hasCompose = fs.existsSync(composeFile);
  
  // Lire les métadonnées du driver
  let metadata = {
    name: driverName,
    capabilities: [],
    deviceType: 'unknown',
    manufacturer: 'unknown',
    model: 'unknown'
  };
  
  // Extraire les métadonnées du fichier compose
  if (hasCompose) {
    try {
      const compose = readJson(composeFile);
      if (compose) {
        metadata.capabilities = Array.isArray(compose.capabilities) ? compose.capabilities : [];
        metadata.deviceType = compose.category || 'unknown';
        metadata.manufacturer = compose.manufacturerName || 'unknown';
        metadata.model = compose.products?.[0]?.modelId || 'unknown';
      }
    } catch (error) {
      console.error(`Erreur lors de l'analyse de ${composeFile}:`, error.message);
    }
  }
  
  return {
    path: driverPath,
    name: driverName,
    hasDriver,
    hasDevice,
    hasCompose,
    ...metadata
  };
}

// Fonction pour trouver les doublons
function findDuplicates(drivers) {
  const duplicates = {};
  
  drivers.forEach(driver => {
    const key = `${driver.deviceType}-${driver.manufacturer}-${driver.model}`;
    if (!duplicates[key]) {
      duplicates[key] = [];
    }
    duplicates[key].push(driver);
  });
  
  // Ne garder que les clés avec plusieurs drivers
  return Object.entries(duplicates)
    .filter(([_, drivers]) => drivers.length > 1)
    .reduce((acc, [key, drivers]) => ({
      ...acc,
      [key]: drivers
    }), {});
}

// Fonction pour fusionner les drivers
function mergeDrivers(drivers) {
  if (drivers.length < 2) return null;
  
  // Trier par nombre de fonctionnalités (du plus complet au moins complet)
  const sortedDrivers = [...drivers].sort((a, b) => 
    b.capabilities.length - a.capabilities.length
  );
  
  const targetDriver = sortedDrivers[0];
  const sourceDrivers = sortedDrivers.slice(1);
  
  console.log(`\nFusion de ${drivers.length} drivers similaires (${targetDriver.name} comme cible)`);
  
  // Fusionner les capacités
  const mergedCapabilities = [...new Set([
    ...targetDriver.capabilities,
    ...sourceDrivers.flatMap(d => d.capabilities)
  ])];
  
  // Mettre à jour le fichier compose du driver cible
  if (targetDriver.hasCompose) {
    try {
      const composePath = path.join(targetDriver.path, 'driver.compose.json');
      const compose = readJson(composePath);
      
      if (compose) {
        // Sauvegarder l'ancienne version
        backupFile(composePath);
        
        // Mettre à jour les capacités
        compose.capabilities = mergedCapabilities;
        
        // Écrire le fichier mis à jour
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
        console.log(`  ✓ Mise à jour de ${path.basename(composePath)} avec ${mergedCapabilities.length} capacités`);
      }
    } catch (error) {
      console.error(`  ✗ Erreur lors de la mise à jour du fichier compose:`, error.message);
    }
  }
  
  // Marquer les drivers sources comme obsolètes
  sourceDrivers.forEach(driver => {
    const readmePath = path.join(driver.path, 'README.md');
    const readmeContent = `# Driver obsolète\n\nCe driver a été fusionné avec ${targetDriver.name}.\n`;
    
    // Créer un README pour indiquer la fusion
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`  ✓ Marquage de ${driver.name} comme obsolète`);
  });
  
  return {
    target: targetDriver,
    sources: sourceDrivers,
    mergedCapabilities
  };
}

// Fonction principale
function main() {
  console.log('Analyse des drivers...');
  
  // Lire tous les dossiers de drivers
  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(DRIVERS_DIR, dirent.name));
  
  console.log(`Trouvé ${driverDirs.length} dossiers de drivers`);
  
  // Analyser chaque driver
  const drivers = driverDirs
    .map(dir => analyzeDriver(dir))
    .filter(Boolean);
  
  console.log(`Analysé ${drivers.length} drivers valides`);
  
  // Trouver les doublons
  const duplicates = findDuplicates(drivers);
  const duplicateGroups = Object.values(duplicates);
  
  console.log(`\nTrouvé ${duplicateGroups.length} groupes de doublons`);
  
  // Fusionner chaque groupe de doublons
  const mergeResults = [];
  
  duplicateGroups.forEach((group, index) => {
    console.log(`\nTraitement du groupe ${index + 1}/${duplicateGroups.length} (${group.length} drivers)`);
    const result = mergeDrivers(group);
    if (result) mergeResults.push(result);
  });
  
  // Afficher le résumé
  console.log('\n=== RÉSUMÉ DE LA FUSION ===');
  console.log(`- Nombre de groupes de doublons traités: ${mergeResults.length}`);
  
  const totalMerged = mergeResults.reduce((sum, group) => sum + group.sources.length, 0);
  console.log(`- Nombre total de drivers fusionnés: ${totalMerged}`);
  
  const avgCapabilities = mergeResults.length > 0 
    ? (mergeResults.reduce((sum, group) => sum + group.mergedCapabilities.length, 0) / mergeResults.length).toFixed(1)
    : 0;
  console.log(`- Nombre moyen de capacités par driver fusionné: ${avgCapabilities}`);
  
  console.log(`\nSauvegarde des drivers originaux dans: ${BACKUP_DIR}`);
}

// Exécuter le script
main();
