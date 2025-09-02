import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const MATRICES_DIR = path.join(ROOT_DIR, 'matrices');
const APP_JSON = path.join(ROOT_DIR, 'app.json');

// Fonction pour lire un fichier JSON
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Erreur lors de la lecture de ${filePath}:`, error.message);
    return null;
  }
}

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const driverFile = path.join(driverPath, 'driver.js');
  const deviceFile = path.join(driverPath, 'device.js');
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  // Lire les métadonnées du driver
  const driverInfo = {
    id: driverName,
    name: driverName,
    path: path.relative(ROOT_DIR, driverPath),
    capabilities: [],
    deviceType: 'unknown',
    manufacturer: 'unknown',
    model: 'unknown',
    hasDriver: fs.existsSync(driverFile),
    hasDevice: fs.existsSync(deviceFile),
    hasCompose: fs.existsSync(composeFile),
    lastModified: fs.statSync(driverPath).mtime.toISOString().split('T')[0]
  };
  
  // Extraire les métadonnées du fichier compose
  if (driverInfo.hasCompose) {
    try {
      const compose = readJson(composeFile);
      if (compose) {
        driverInfo.capabilities = Array.isArray(compose.capabilities) ? compose.capabilities : [];
        driverInfo.deviceType = compose.category || 'unknown';
        driverInfo.manufacturer = compose.manufacturerName || 'unknown';
        driverInfo.model = compose.products?.[0]?.modelId || 'unknown';
      }
    } catch (error) {
      console.error(`Erreur lors de l'analyse de ${composeFile}:`, error.message);
    }
  }
  
  return driverInfo;
}

// Fonction pour générer la matrice des capacités
function generateCapabilityMatrix(drivers) {
  const capabilities = new Set();
  
  // Collecter toutes les capacités uniques
  drivers.forEach(driver => {
    driver.capabilities.forEach(cap => capabilities.add(cap));
  });
  
  // Créer la matrice
  const matrix = {
    updated: new Date().toISOString(),
    drivers: {}
  };
  
  // Remplir la matrice
  drivers.forEach(driver => {
    matrix.drivers[driver.id] = {
      name: driver.name,
      type: driver.deviceType,
      manufacturer: driver.manufacturer,
      model: driver.model,
      capabilities: {}
    };
    
    // Marquer chaque capacité
    capabilities.forEach(cap => {
      matrix.drivers[driver.id].capabilities[cap] = driver.capabilities.includes(cap);
    });
  });
  
  return matrix;
}

// Fonction pour générer la matrice des appareils
function generateDeviceMatrix(drivers) {
  const devices = [];
  
  drivers.forEach(driver => {
    devices.push({
      id: driver.id,
      name: driver.name,
      type: driver.deviceType,
      manufacturer: driver.manufacturer,
      model: driver.model,
      capabilities: driver.capabilities,
      lastModified: driver.lastModified,
      path: driver.path
    });
  });
  
  return {
    updated: new Date().toISOString(),
    count: devices.length,
    devices: devices.sort((a, b) => a.name.localeCompare(b.name))
  };
}

// Fonction pour mettre à jour app.json
function updateAppJson(drivers) {
  try {
    const appJson = readJson(APP_JSON) || {};
    
    // Mettre à jour la section drivers
    if (!appJson.drivers) appJson.drivers = [];
    
    // Mettre à jour chaque driver
    drivers.forEach(driver => {
      const existingDriver = appJson.drivers.find(d => d.id === driver.id);
      
      if (existingDriver) {
        // Mettre à jour le driver existant
        existingDriver.name = driver.name;
        existingDriver.class = driver.deviceType;
        existingDriver.capabilities = driver.capabilities;
      } else {
        // Ajouter un nouveau driver
        appJson.drivers.push({
          id: driver.id,
          name: driver.name,
          class: driver.deviceType,
          capabilities: driver.capabilities
        });
      }
    });
    
    // Trier les drivers par ID
    appJson.drivers.sort((a, b) => a.id.localeCompare(b.id));
    
    // Sauvegarder l'ancienne version
    const backupPath = path.join(ROOT_DIR, 'backup', 'app.json.backup');
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(APP_JSON, backupPath);
    
    // Écrire le fichier mis à jour
    fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
    
    console.log(`✓ app.json mis à jour avec ${appJson.drivers.length} drivers`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de app.json:', error.message);
    return false;
  }
}

// Fonction principale
function main() {
  console.log('Mise à jour des matrices de compatibilité...');
  
  // Créer le dossier des matrices s'il n'existe pas
  if (!fs.existsSync(MATRICES_DIR)) {
    fs.mkdirSync(MATRICES_DIR, { recursive: true });
  }
  
  // Lire tous les dossiers de drivers
  const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(DRIVERS_DIR, dirent.name));
  
  console.log(`Analyse de ${driverDirs.length} dossiers de drivers...`);
  
  // Analyser chaque driver
  const drivers = driverDirs
    .map(dir => analyzeDriver(dir))
    .filter(Boolean);
  
  console.log(`Analyse terminée pour ${drivers.length} drivers valides`);
  
  // Générer les matrices
  console.log('\nGénération des matrices...');
  
  // Matrice des capacités
  const capabilityMatrix = generateCapabilityMatrix(drivers);
  const capabilityMatrixPath = path.join(MATRICES_DIR, 'capability_matrix.json');
  fs.writeFileSync(capabilityMatrixPath, JSON.stringify(capabilityMatrix, null, 2) + '\n');
  console.log(`✓ Matrice des capacités générée: ${capabilityMatrixPath}`);
  
  // Matrice des appareils
  const deviceMatrix = generateDeviceMatrix(drivers);
  const deviceMatrixPath = path.join(MATRICES_DIR, 'device_matrix.json');
  fs.writeFileSync(deviceMatrixPath, JSON.stringify(deviceMatrix, null, 2) + '\n');
  console.log(`✓ Matrice des appareils générée: ${deviceMatrixPath}`);
  
  // Mettre à jour app.json
  console.log('\nMise à jour de app.json...');
  if (updateAppJson(drivers)) {
    console.log('✓ app.json mis à jour avec succès');
  } else {
    console.log('✗ Erreur lors de la mise à jour de app.json');
  }
  
  console.log('\n=== RÉSUMÉ ===');
  console.log(`- Drivers analysés: ${drivers.length}`);
  console.log(`- Capacités uniques: ${Object.keys(capabilityMatrix.drivers[Object.keys(capabilityMatrix.drivers)[0]]?.capabilities || {}).length}`);
  console.log(`- Types d'appareils: ${new Set(drivers.map(d => d.deviceType)).size}`);
  console.log(`- Fabricants: ${new Set(drivers.map(d => d.manufacturer)).size}`);
  
  console.log('\nMatrices de compatibilité mises à jour avec succès !');
}

// Exécuter le script
main();
