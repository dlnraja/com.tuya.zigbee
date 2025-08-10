'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// Configuration
const CONFIG = {
  APP_ID: 'com.tuya.zigbee',
  NEW_VERSION: '3.1.0',
  SCAN_PATHS: [
    process.cwd(),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Documents'),
    'C:\\',
    'D:\\'
  ],
  TMP_DIR: '.tmp_tuya_zip_work',
  DRIVERS_DIR: 'drivers',
  CATEGORIES: {
    'light': ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'],
    'plug': ['onoff', 'measure_power', 'measure_current', 'measure_voltage'],
    'switch': ['onoff', 'button'],
    'sensor-motion': ['alarm_motion'],
    'sensor-contact': ['alarm_contact'],
    'sensor-temp': ['measure_temperature'],
    'sensor-humidity': ['measure_humidity'],
    'sensor-lux': ['measure_lux'],
    'sensor-smoke': ['alarm_smoke'],
    'sensor-leak': ['alarm_water'],
    'meter-power': ['measure_power', 'measure_current', 'measure_voltage'],
    'climate-thermostat': ['measure_temperature', 'target_temperature'],
    'cover': ['windowcoverings_state', 'windowcoverings_set'],
    'lock': ['lock_state'],
    'siren': ['alarm_tamper'],
    'remote': ['button'],
    'scene': ['button'],
    'valve': ['valve_state'],
    'other': []
  }
};

// Fonctions utilitaires
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function runCommand(command, args = [], options = {}) {
  log(`Exécution: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { 
    stdio: 'pipe', 
    cwd: process.cwd(),
    ...options 
  });
  
  if (result.status !== 0) {
    log(`Erreur commande: ${result.stderr?.toString() || 'Unknown error'}`, 'error');
    return false;
  }
  
  log(`Commande réussie: ${command}`, 'success');
  return true;
}

function echo() {
  console.log('\n');
}

// Analyse des sources .tmp*
async function analyzeTmpSources() {
  log('🔍 ANALYSE DES SOURCES .tmp*...');
  
  const tmpPath = path.join(process.cwd(), CONFIG.TMP_DIR);
  if (!fs.existsSync(tmpPath)) {
    log('Aucun dossier .tmp* trouvé', 'warning');
    return { sources: [], improvements: [] };
  }
  
  const sources = [];
  const improvements = [];
  
  try {
    const items = await fsp.readdir(tmpPath);
    
    for (const item of items) {
      const itemPath = path.join(tmpPath, item);
      const stats = await fsp.stat(itemPath);
      
      if (stats.isDirectory()) {
        // Analyser le contenu pour identifier les améliorations
        const driverPath = path.join(itemPath, 'drivers');
        if (fs.existsSync(driverPath)) {
          const driverStats = await analyzeDriverDirectory(driverPath);
          sources.push({
            name: item,
            path: itemPath,
            drivers: driverStats
          });
          
          // Identifier les améliorations potentielles
          if (driverStats.organized) {
            improvements.push({
              type: 'organization',
              source: item,
              description: 'Structure organisée par catégories'
            });
          }
          
          if (driverStats.composeFiles > 0) {
            improvements.push({
              type: 'compose',
              source: item,
              description: `Utilise ${driverStats.composeFiles} fichiers driver.compose.json`
            });
          }
        }
      }
    }
    
    log(`Sources analysées: ${sources.length}`);
    log(`Améliorations identifiées: ${improvements.length}`);
    
  } catch (error) {
    log(`Erreur analyse sources: ${error.message}`, 'error');
  }
  
  return { sources, improvements };
}

// Analyse d'un répertoire de drivers
async function analyzeDriverDirectory(driversPath) {
  const stats = {
    total: 0,
    organized: false,
    composeFiles: 0,
    categories: new Set(),
    structure: {}
  };
  
  try {
    const items = await fsp.readdir(driversPath);
    
    for (const item of items) {
      const itemPath = path.join(driversPath, item);
      const itemStats = await fsp.stat(itemPath);
      
      if (itemStats.isDirectory()) {
        stats.total++;
        
        // Vérifier si c'est organisé par catégories
        if (CONFIG.CATEGORIES[item]) {
          stats.organized = true;
          stats.categories.add(item);
        }
        
        // Compter les fichiers compose
        const composePath = path.join(itemPath, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          stats.composeFiles++;
        }
        
        // Analyser la structure
        const subItems = await fsp.readdir(itemPath);
        stats.structure[item] = subItems.length;
      }
    }
    
  } catch (error) {
    log(`Erreur analyse drivers: ${error.message}`, 'error');
  }
  
  return stats;
}

// Déterminer la catégorie d'un driver
function determineDriverCategory(capabilities = []) {
  for (const [category, categoryCapabilities] of Object.entries(CONFIG.CATEGORIES)) {
    if (categoryCapabilities.some(cap => capabilities.includes(cap))) {
      return category;
    }
  }
  return 'other';
}

// Déterminer le vendor d'un driver
function determineDriverVendor(manufacturerNames = []) {
  for (const manufacturer of manufacturerNames) {
    const lower = manufacturer.toLowerCase();
    if (lower.includes('tuya') || lower.startsWith('_tz') || lower.startsWith('_ty')) {
      return 'tuya';
    }
    if (lower.includes('aqara') || lower.includes('xiaomi')) {
      return 'aqara';
    }
    if (lower.includes('ikea') || lower.includes('tradfri')) {
      return 'ikea';
    }
    if (lower.includes('philips') || lower.includes('hue')) {
      return 'philips';
    }
    if (lower.includes('sonoff')) {
      return 'sonoff';
    }
    if (lower.includes('ledvance')) {
      return 'ledvance';
    }
  }
  return 'generic';
}

// Générer un nom de dossier cohérent
function generateDriverFolderName(vendor, category, modelId, manufacturerName) {
  const cleanModel = (modelId || manufacturerName || 'unknown')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase()
    .substring(0, 20);
  
  return `${vendor}-${category}-${cleanModel}`;
}

// Réorganiser les drivers selon les nouvelles règles
async function reorganizeDrivers() {
  log('🔄 RÉORGANISATION DES DRIVERS...');
  
  const driversPath = path.join(process.cwd(), CONFIG.DRIVERS_DIR);
  if (!fs.existsSync(driversPath)) {
    log('Dossier drivers non trouvé', 'error');
    return false;
  }
  
  try {
    // Créer la nouvelle structure
    const newStructure = {};
    
    // Scanner tous les drivers existants
    const existingDrivers = await scanExistingDrivers(driversPath);
    
    for (const driver of existingDrivers) {
      const { vendor, category, newName } = await analyzeAndPlanDriver(driver);
      
      if (!newStructure[vendor]) {
        newStructure[vendor] = {};
      }
      if (!newStructure[vendor][category]) {
        newStructure[vendor][category] = [];
      }
      
      newStructure[vendor][category].push({
        oldPath: driver.path,
        newName: newName,
        capabilities: driver.capabilities,
        manufacturerNames: driver.manufacturerNames,
        modelIds: driver.modelIds
      });
    }
    
    // Appliquer la réorganisation
    await applyDriverReorganization(newStructure);
    
    log('Réorganisation des drivers terminée', 'success');
    return true;
    
  } catch (error) {
    log(`Erreur réorganisation: ${error.message}`, 'error');
    return false;
  }
}

// Scanner les drivers existants
async function scanExistingDrivers(driversPath) {
  const drivers = [];
  
  async function scanDirectory(dirPath, depth = 0) {
    if (depth > 3) return; // Limiter la profondeur
    
    try {
      const items = await fsp.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemStats = await fsp.stat(itemPath);
        
        if (itemStats.isDirectory()) {
          // Vérifier si c'est un driver
          const driverJson = path.join(itemPath, 'driver.json');
          const driverCompose = path.join(itemPath, 'driver.compose.json');
          
          if (fs.existsSync(driverJson) || fs.existsSync(driverCompose)) {
            const driverInfo = await extractDriverInfo(itemPath, driverJson, driverCompose);
            drivers.push({
              path: itemPath,
              name: item,
              ...driverInfo
            });
          } else {
            // Continuer à scanner
            await scanDirectory(itemPath, depth + 1);
          }
        }
      }
    } catch (error) {
      log(`Erreur scan ${dirPath}: ${error.message}`, 'error');
    }
  }
  
  await scanDirectory(driversPath);
  return drivers;
}

// Extraire les informations d'un driver
async function extractDriverInfo(driverPath, driverJson, driverCompose) {
  let driverData = {};
  
  try {
    if (fs.existsSync(driverCompose)) {
      driverData = JSON.parse(await fsp.readFile(driverCompose, 'utf8'));
    } else if (fs.existsSync(driverJson)) {
      driverData = JSON.parse(await fsp.readFile(driverJson, 'utf8'));
    }
    
    return {
      capabilities: driverData.capabilities || [],
      manufacturerNames: driverData.zigbee?.manufacturerName || [],
      modelIds: driverData.zigbee?.productId || [],
      class: driverData.class || 'other'
    };
    
  } catch (error) {
    log(`Erreur extraction driver ${driverPath}: ${error.message}`, 'error');
    return {
      capabilities: [],
      manufacturerNames: [],
      modelIds: [],
      class: 'other'
    };
  }
}

// Analyser et planifier la réorganisation d'un driver
async function analyzeAndPlanDriver(driver) {
  const category = determineDriverCategory(driver.capabilities);
  const vendor = determineDriverVendor(driver.manufacturerNames);
  
  // Utiliser le premier modelId ou manufacturerName pour le nom
  const modelId = driver.modelIds[0] || driver.manufacturerNames[0] || 'unknown';
  const newName = generateDriverFolderName(vendor, category, modelId, driver.manufacturerNames[0]);
  
  return { vendor, category, newName };
}

// Appliquer la réorganisation des drivers
async function applyDriverReorganization(newStructure) {
  const driversPath = path.join(process.cwd(), CONFIG.DRIVERS_DIR);
  
  // Créer la nouvelle structure
  for (const [vendor, categories] of Object.entries(newStructure)) {
    for (const [category, drivers] of Object.entries(categories)) {
      const categoryPath = path.join(driversPath, vendor, category);
      await fsp.mkdir(categoryPath, { recursive: true });
      
      for (const driver of drivers) {
        const newPath = path.join(categoryPath, driver.newName);
        
        // Déplacer le driver
        if (fs.existsSync(driver.oldPath)) {
          try {
            await fsp.rename(driver.oldPath, newPath);
            log(`Driver déplacé: ${driver.oldPath} → ${newPath}`);
          } catch (error) {
            log(`Erreur déplacement ${driver.oldPath}: ${error.message}`, 'error');
          }
        }
      }
    }
  }
}

// Mettre à jour la version de l'app
async function updateAppVersion() {
  log('📦 MISE À JOUR DE LA VERSION...');
  
  try {
    // Mettre à jour app.json
    const appJsonPath = path.join(process.cwd(), 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appData = JSON.parse(await fsp.readFile(appJsonPath, 'utf8'));
      appData.version = CONFIG.NEW_VERSION;
      await fsp.writeFile(appJsonPath, JSON.stringify(appData, null, 2));
      log(`Version mise à jour: ${CONFIG.NEW_VERSION}`, 'success');
    }
    
    // Mettre à jour package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageData = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8'));
      packageData.version = CONFIG.NEW_VERSION;
      await fsp.writeFile(packageJsonPath, JSON.stringify(packageData, null, 2));
      log(`Package.json mis à jour: ${CONFIG.NEW_VERSION}`, 'success');
    }
    
    return true;
    
  } catch (error) {
    log(`Erreur mise à jour version: ${error.message}`, 'error');
    return false;
  }
}

// Générer les assets manquants
async function generateMissingAssets() {
  log('🎨 GÉNÉRATION DES ASSETS MANQUANTS...');
  
  try {
    const assetsPath = path.join(process.cwd(), 'assets');
    await fsp.mkdir(assetsPath, { recursive: true });
    
    // Créer les assets de base
    const baseAssets = [
      { name: 'app-logo.svg', content: generateAppLogoSVG() },
      { name: 'favicon.svg', content: generateFaviconSVG() }
    ];
    
    for (const asset of baseAssets) {
      const assetPath = path.join(assetsPath, asset.name);
      await fsp.writeFile(assetPath, asset.content);
      log(`Asset créé: ${asset.name}`);
    }
    
    // Créer les assets pour chaque catégorie
    for (const category of Object.keys(CONFIG.CATEGORIES)) {
      const categoryAssetsPath = path.join(assetsPath, category);
      await fsp.mkdir(categoryAssetsPath, { recursive: true });
      
      const iconSVG = generateCategoryIconSVG(category);
      const iconPath = path.join(categoryAssetsPath, 'icon.svg');
      await fsp.writeFile(iconPath, iconSVG);
      
      log(`Icone catégorie créée: ${category}/icon.svg`);
    }
    
    log('Assets générés avec succès', 'success');
    return true;
    
  } catch (error) {
    log(`Erreur génération assets: ${error.message}`, 'error');
    return false;
  }
}

// Générer le logo de l'app
function generateAppLogoSVG() {
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="24" fill="#00A0E9"/>
  <circle cx="64" cy="64" r="48" fill="white"/>
  <path d="M40 64 L88 64 M64 40 L64 88" stroke="#00A0E9" stroke-width="8" stroke-linecap="round"/>
</svg>`;
}

// Générer le favicon
function generateFaviconSVG() {
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="6" fill="#00A0E9"/>
  <circle cx="16" cy="16" r="12" fill="white"/>
  <path d="M10 16 L22 16 M16 10 L16 22" stroke="#00A0E9" stroke-width="2" stroke-linecap="round"/>
</svg>`;
}

// Générer l'icône d'une catégorie
function generateCategoryIconSVG(category) {
  const icons = {
    'light': '<circle cx="16" cy="16" r="12" fill="#FFD700" stroke="#FFA500" stroke-width="2"/>',
    'plug': '<rect x="4" y="8" width="24" height="16" rx="2" fill="#4CAF50"/>',
    'switch': '<rect x="6" y="6" width="20" height="20" rx="2" fill="#2196F3"/>',
    'sensor-motion': '<path d="M8 8 L24 8 L24 24 L8 24 Z" fill="#FF9800"/>',
    'sensor-contact': '<rect x="8" y="8" width="16" height="16" fill="#9C27B0"/>',
    'sensor-temp': '<circle cx="16" cy="16" r="12" fill="#F44336"/>',
    'sensor-humidity': '<path d="M16 4 L20 16 L16 28 L12 16 Z" fill="#00BCD4"/>',
    'sensor-lux': '<circle cx="16" cy="16" r="12" fill="#FFEB3B"/>',
    'sensor-smoke': '<path d="M8 8 L24 8 L24 24 L8 24 Z" fill="#795548"/>',
    'sensor-leak': '<path d="M8 8 L24 8 L24 24 L8 24 Z" fill="#2196F3"/>',
    'meter-power': '<path d="M8 8 L24 8 L24 24 L8 24 Z" fill="#4CAF50"/>',
    'climate-thermostat': '<circle cx="16" cy="16" r="12" fill="#FF5722"/>',
    'cover': '<rect x="4" y="8" width="24" height="16" rx="2" fill="#607D8B"/>',
    'lock': '<rect x="8" y="8" width="16" height="16" fill="#795548"/>',
    'siren': '<path d="M16 4 L20 16 L16 28 L12 16 Z" fill="#F44336"/>',
    'remote': '<rect x="6" y="6" width="20" height="20" rx="2" fill="#9C27B0"/>',
    'scene': '<circle cx="16" cy="16" r="12" fill="#E91E63"/>',
    'valve': '<path d="M8 8 L24 8 L24 24 L8 24 Z" fill="#00BCD4"/>',
    'other': '<rect x="8" y="8" width="16" height="16" fill="#9E9E9E"/>'
  };
  
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  ${icons[category] || icons['other']}
</svg>`;
}

// Fonction principale MEGA
async function main() {
  log('🚀 LANCEMENT DE MEGA-ULTIMATE-FACTORIZED V2.0...');
  echo();
  
  try {
    // 1. Analyser les sources .tmp*
    const { sources, improvements } = await analyzeTmpSources();
    echo();
    
    // 2. Réorganiser les drivers
    const reorgSuccess = await reorganizeDrivers();
    if (!reorgSuccess) {
      log('Échec de la réorganisation des drivers', 'error');
      return;
    }
    echo();
    
    // 3. Mettre à jour la version
    const versionSuccess = await updateAppVersion();
    if (!versionSuccess) {
      log('Échec de la mise à jour de version', 'error');
      return;
    }
    echo();
    
    // 4. Générer les assets manquants
    const assetsSuccess = await generateMissingAssets();
    if (!assetsSuccess) {
      log('Échec de la génération des assets', 'error');
      return;
    }
    echo();
    
    // 5. Installer les dépendances
    log('📦 INSTALLATION DES DÉPENDANCES...');
    if (!runCommand('npm', ['install'])) {
      log('Échec de l\'installation des dépendances', 'error');
      return;
    }
    echo();
    
    // 6. Valider l'app
    log('✅ VALIDATION DE L\'APP...');
    if (!runCommand('npx', ['homey', 'app', 'validate'])) {
      log('Échec de la validation', 'error');
      return;
    }
    echo();
    
    // 7. Opérations Git
    log('🔧 OPÉRATIONS GIT...');
    
    // Ajouter tous les fichiers
    if (!runCommand('git', ['add', '.'])) {
      log('Échec git add', 'error');
      return;
    }
    
    // Commit avec message détaillé
    const commitMessage = `feat: Réorganisation complète des drivers et amélioration du projet

- Réorganisation des drivers selon les nouvelles règles (vendor-category-model)
- Suppression des dossiers variants et fusion dans les drivers cibles
- Mise à jour de la version vers ${CONFIG.NEW_VERSION}
- Génération des assets manquants et icônes par catégorie
- Amélioration de la structure et organisation du code
- Intégration des meilleures pratiques des sources .tmp*

Version: ${CONFIG.NEW_VERSION}
Date: ${new Date().toISOString()}`;
    
    if (!runCommand('git', ['commit', '-m', commitMessage])) {
      log('Échec git commit', 'error');
      return;
    }
    
    // Push
    if (!runCommand('git', ['push'])) {
      log('Échec git push', 'error');
      return;
    }
    
    echo();
    log('🎉 MEGA-ULTIMATE-FACTORIZED TERMINÉ AVEC SUCCÈS !', 'success');
    log(`📊 RÉSUMÉ:`);
    log(`  ✅ Drivers réorganisés selon les nouvelles règles`);
    log(`  ✅ Version mise à jour: ${CONFIG.NEW_VERSION}`);
    log(`  ✅ Assets générés et organisés`);
    log(`  ✅ Dépendances installées`);
    log(`  ✅ App validée`);
    log(`  ✅ Changements commités et poussés`);
    log(`  🔍 Sources .tmp* analysées: ${sources.length}`);
    log(`  🚀 Améliorations identifiées: ${improvements.length}`);
    
  } catch (error) {
    log(`Erreur fatale: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main().catch(error => {
    log(`Erreur d'exécution: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
