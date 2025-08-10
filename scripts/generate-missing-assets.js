'use strict';
const fs = require('fs'), path = require('path');

// Configuration des assets
const ASSETS_CONFIG = {
  ROOT: process.cwd(),
  DRIVERS: path.join(process.cwd(), 'drivers'),
  
  // Types d'assets à générer
  ASSET_TYPES: {
    ICON: 'icon.svg',
    ICON_LARGE: 'icon-large.svg',
    ICON_SMALL: 'icon-small.svg',
    IMAGE: 'image.svg',
    IMAGE_LARGE: 'image-large.svg'
  },
  
  // Templates SVG par catégorie
  SVG_TEMPLATES: {
    LIGHT: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="8"/>
  <path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>
  <path d="M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41"/>
  <path d="M4.93 19.07l1.41-1.41M17.66 5.34l1.41-1.41"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="24" cy="24" r="16"/>
  <path d="M24 8v4M24 36v4M8 24h4M40 24h4"/>
  <path d="M9.86 9.86l2.82 2.82M35.32 35.32l2.82 2.82"/>
  <path d="M9.86 38.14l2.82-2.82M35.32 12.68l2.82-2.82"/>
</svg>`
    },
    SWITCH: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="2" y="6" width="20" height="12" rx="2"/>
  <circle cx="8" cy="12" r="2"/>
  <path d="M16 12h4"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="4" y="12" width="40" height="24" rx="4"/>
  <circle cx="16" cy="24" r="4"/>
  <path d="M32 24h8"/>
</svg>`
    },
    SENSOR: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2v4M12 18v4"/>
  <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83"/>
  <path d="M2 12h4M18 12h4"/>
  <path d="M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  <circle cx="12" cy="12" r="3"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M24 4v8M24 36v8"/>
  <path d="M9.86 9.86l5.66 5.66M32.48 32.48l5.66 5.66"/>
  <path d="M4 24h8M36 24h8"/>
  <path d="M9.86 38.14l5.66-5.66M32.48 15.52l5.66-5.66"/>
  <circle cx="24" cy="24" r="6"/>
</svg>`
    },
    CONTROLLER: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="2" y="4" width="20" height="16" rx="2"/>
  <circle cx="8" cy="12" r="1"/>
  <circle cx="12" cy="12" r="1"/>
  <circle cx="16" cy="12" r="1"/>
  <path d="M8 8h8M8 16h8"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="4" y="8" width="40" height="32" rx="4"/>
  <circle cx="16" cy="24" r="2"/>
  <circle cx="24" cy="24" r="2"/>
  <circle cx="32" cy="24" r="2"/>
  <path d="M16 16h16M16 32h16"/>
</svg>`
    },
    APPLIANCE: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="6" width="18" height="12" rx="2"/>
  <path d="M7 6v12"/>
  <path d="M17 6v12"/>
  <path d="M3 12h18"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="6" y="12" width="36" height="24" rx="4"/>
  <path d="M14 12v24"/>
  <path d="M34 12v24"/>
  <path d="M6 24h36"/>
</svg>`
    },
    GENERIC: {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M9 9h6v6H9z"/>
</svg>`,
      image: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="6" y="6" width="36" height="36" rx="4"/>
  <path d="M18 18h12v12H18z"/>
</svg>`
    }
  }
};

function log(msg, level = 'INFO') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[GENERATE-ASSETS] [${timestamp}]`;
  console.log(`${prefix} ${level}: ${msg}`);
}

// Fonction pour déterminer la catégorie d'un driver
function getDriverCategory(driverName, capabilities = []) {
  const name = driverName.toLowerCase();
  const caps = capabilities.map(c => c.toLowerCase());
  
  const categories = {
    LIGHT: ['light', 'bulb', 'lamp', 'led', 'strip', 'ceiling'],
    SWITCH: ['switch', 'outlet', 'plug', 'socket', 'power'],
    SENSOR: ['sensor', 'motion', 'temperature', 'humidity', 'door', 'window'],
    CONTROLLER: ['controller', 'remote', 'hub', 'bridge'],
    APPLIANCE: ['appliance', 'fan', 'curtain', 'blind', 'lock']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => name.includes(keyword) || caps.some(cap => cap.includes(keyword)))) {
      return category;
    }
  }
  
  return 'GENERIC';
}

// Fonction pour créer un dossier assets
function createAssetsDirectory(driverPath) {
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
    log(`📁 Créé: ${assetsPath}`);
  }
  return assetsPath;
}

// Fonction pour générer un asset SVG
function generateSVGAsset(assetsPath, fileName, template, size = 'normal') {
  const filePath = path.join(assetsPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    // Adapter le template selon la taille
    let svgContent = template;
    if (size === 'large') {
      svgContent = svgContent.replace(/viewBox="0 0 24 24"/, 'viewBox="0 0 48 48"');
    } else if (size === 'small') {
      svgContent = svgContent.replace(/viewBox="0 0 24 24"/, 'viewBox="0 0 16 16"');
    }
    
    fs.writeFileSync(filePath, svgContent);
    log(`🎨 Généré: ${fileName}`);
    return true;
  }
  
  return false;
}

// Fonction pour générer tous les assets d'un driver
function generateDriverAssets(driverPath, driverName, capabilities = []) {
  const category = getDriverCategory(driverName, capabilities);
  const templates = ASSETS_CONFIG.SVG_TEMPLATES[category] || ASSETS_CONFIG.SVG_TEMPLATES.GENERIC;
  
  // Créer le dossier assets
  const assetsPath = createAssetsDirectory(driverPath);
  
  let generatedCount = 0;
  
  // Générer les icônes
  if (templates.icon) {
    if (generateSVGAsset(assetsPath, ASSETS_CONFIG.ASSET_TYPES.ICON, templates.icon)) generatedCount++;
    if (generateSVGAsset(assetsPath, ASSETS_CONFIG.ASSET_TYPES.ICON_LARGE, templates.icon, 'large')) generatedCount++;
    if (generateSVGAsset(assetsPath, ASSETS_CONFIG.ASSET_TYPES.ICON_SMALL, templates.icon, 'small')) generatedCount++;
  }
  
  // Générer les images
  if (templates.image) {
    if (generateSVGAsset(assetsPath, ASSETS_CONFIG.ASSET_TYPES.IMAGE, templates.image)) generatedCount++;
    if (generateSVGAsset(assetsPath, ASSETS_CONFIG.ASSET_TYPES.IMAGE_LARGE, templates.image, 'large')) generatedCount++;
  }
  
  return generatedCount;
}

// Fonction pour scanner et traiter tous les drivers
function processAllDrivers() {
  log('🚀 Début de la génération des assets manquants...');
  
  if (!fs.existsSync(ASSETS_CONFIG.DRIVERS)) {
    log('❌ Dossier drivers/ non trouvé', 'ERROR');
    return false;
  }
  
  let totalDrivers = 0;
  let processedDrivers = 0;
  let totalAssetsGenerated = 0;
  
  // Scanner récursivement le dossier drivers
  function scanDrivers(dirPath, depth = 0) {
    if (depth > 5) return; // Limiter la profondeur
    
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Vérifier si c'est un driver
          const driverJsonPath = path.join(itemPath, 'driver.json');
          const driverComposePath = path.join(itemPath, 'driver.compose.json');
          
          if (fs.existsSync(driverJsonPath) || fs.existsSync(driverComposePath)) {
            totalDrivers++;
            log(`🔧 Traitement du driver: ${item.name}`);
            
            // Lire la configuration du driver
            let driverConfig = null;
            try {
              if (fs.existsSync(driverComposePath)) {
                driverConfig = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
              } else if (fs.existsSync(driverJsonPath)) {
                driverConfig = JSON.parse(fs.readFileSync(driverJsonPath, 'utf8'));
              }
            } catch (e) {
              log(`⚠️  Erreur lecture config ${item.name}: ${e.message}`, 'WARN');
              continue;
            }
            
            if (driverConfig) {
              const capabilities = driverConfig.capabilities || [];
              const assetsGenerated = generateDriverAssets(itemPath, item.name, capabilities);
              totalAssetsGenerated += assetsGenerated;
              
              if (assetsGenerated > 0) {
                processedDrivers++;
                log(`✅ Driver traité: ${item.name} (${assetsGenerated} assets générés)`);
              } else {
                log(`ℹ️  Driver déjà complet: ${item.name}`);
              }
            }
          } else {
            // Continuer à scanner les sous-dossiers
            scanDrivers(itemPath, depth + 1);
          }
        }
      }
    } catch (e) {
      log(`⚠️  Erreur scan ${dirPath}: ${e.message}`, 'WARN');
    }
  }
  
  // Commencer le scan
  scanDrivers(ASSETS_CONFIG.DRIVERS);
  
  // Rapport final
  log('📊 RAPPORT FINAL DE GÉNÉRATION DES ASSETS');
  log(`🔧 Total drivers: ${totalDrivers}`);
  log(`✅ Drivers traités: ${processedDrivers}`);
  log(`🎨 Total assets générés: ${totalAssetsGenerated}`);
  
  if (totalDrivers === 0) {
    log('ℹ️  Aucun driver trouvé');
  } else if (processedDrivers === 0) {
    log('ℹ️  Tous les drivers ont déjà leurs assets');
  } else {
    log(`🎉 ${processedDrivers} drivers enrichis avec ${totalAssetsGenerated} assets !`);
  }
  
  return true;
}

// Fonction pour créer des assets personnalisés
function createCustomAssets() {
  log('🎨 Création d\'assets personnalisés...');
  
  const customAssetsPath = path.join(ASSETS_CONFIG.ROOT, 'assets', 'custom');
  if (!fs.existsSync(customAssetsPath)) {
    fs.mkdirSync(customAssetsPath, { recursive: true });
  }
  
  // Créer un logo personnalisé pour l'app
  const appLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="32" cy="32" r="28" fill="#4CAF50" stroke="#2E7D32"/>
  <path d="M16 32h8l4-8 4 8h8" stroke="white" stroke-width="3"/>
  <circle cx="32" cy="32" r="4" fill="white"/>
  <path d="M24 20l4-4 4 4M40 44l-4 4-4-4" stroke="white" stroke-width="2"/>
</svg>`;
  
  const logoPath = path.join(customAssetsPath, 'app-logo.svg');
  fs.writeFileSync(logoPath, appLogo);
  log(`🎨 Logo personnalisé créé: app-logo.svg`);
  
  // Créer un favicon
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
  <circle cx="16" cy="16" r="14" fill="#4CAF50"/>
  <path d="M8 16h6l3-6 3 6h6" stroke="white" stroke-width="2"/>
  <circle cx="16" cy="16" r="2" fill="white"/>
</svg>`;
  
  const faviconPath = path.join(customAssetsPath, 'favicon.svg');
  fs.writeFileSync(faviconPath, favicon);
  log(`🎨 Favicon créé: favicon.svg`);
  
  return true;
}

// Fonction principale
async function main() {
  log('🚀 DÉMARRAGE DE LA GÉNÉRATION DES ASSETS MANQUANTS');
  
  try {
    // 1. Créer des assets personnalisés
    createCustomAssets();
    
    // 2. Traiter tous les drivers
    processAllDrivers();
    
    log('🎉 GÉNÉRATION DES ASSETS TERMINÉE AVEC SUCCÈS !');
    return true;
  } catch (e) {
    log(`❌ ERREUR FATALE: ${e.message}`, 'ERROR');
    return false;
  }
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

module.exports = { generateDriverAssets, processAllDrivers, createCustomAssets };
