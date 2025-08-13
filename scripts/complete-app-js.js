// !/usr/bin/env node

/**
 * Script de complétion automatique de app.js
 * Basé sur les instructions du dossier fold
 * 
 * Objectifs :
 * - Scanner tous les dossiers de /drivers/tuya/ et /drivers/zigbee/
 * - Générer une structure module.exports complète
 * - Ajouter dynamiquement tous les require nécessaires
 * - Vérifier la cohérence des drivers
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = 'drivers';
const APP_JS_PATH = 'app.js';
const BACKUP_EXT = '.backup';

// Structure des drivers détectés
let detectedDrivers = {
  tuya: {},
  zigbee: {}
};

// Fonction principale
async function completeAppJS() {
  console.log('🚀 Début de la complétion automatique de app.js...');
  
  try {
    // 1. Sauvegarde de l'ancien app.js
    await backupAppJS();
    
    // 2. Scanner tous les drivers
    await scanAllDrivers();
    
    // 3. Générer le nouveau app.js
    await generateNewAppJS();
    
    // 4. Vérifier la cohérence
    await validateAppJS();
    
    console.log('✅ app.js complété avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la complétion:', error.message);
    await restoreAppJS();
    throw error;
  }
}

// Sauvegarde de app.js
async function backupAppJS() {
  if (fs.existsSync(APP_JS_PATH)) {
    const backupPath = APP_JS_PATH + BACKUP_EXT;
    fs.copyFileSync(APP_JS_PATH, backupPath);
    console.log(`💾 Sauvegarde créée: ${backupPath}`);
  }
}

// Scanner tous les drivers
async function scanAllDrivers() {
  console.log('🔍 Scanner des drivers...');
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.log('⚠️ Dossier drivers/ non trouvé, création...');
    fs.mkdirSync(DRIVERS_DIR, { recursive: true });
    return;
  }
  
  const domains = ['tuya', 'zigbee'];
  
  for (const domain of domains) {
    const domainPath = path.join(DRIVERS_DIR, domain);
    if (fs.existsSync(domainPath)) {
      detectedDrivers[domain] = await scanDomain(domainPath, domain);
    }
  }
  
  console.log(`📊 Drivers détectés: Tuya=${Object.keys(detectedDrivers.tuya).length}, Zigbee=${Object.keys(detectedDrivers.zigbee).length}`);
}

// Scanner un domaine (tuya ou zigbee)
async function scanDomain(domainPath, domain) {
  const drivers = {};
  
  try {
    const categories = fs.readdirSync(domainPath).filter(item => 
      fs.statSync(path.join(domainPath, item)).isDirectory()
    );
    
    for (const category of categories) {
      const categoryPath = path.join(domainPath, category);
      const vendors = fs.readdirSync(categoryPath).filter(item => 
        fs.statSync(path.join(categoryPath, item)).isDirectory()
      );
      
      for (const vendor of vendors) {
        const vendorPath = path.join(categoryPath, vendor);
        const models = fs.readdirSync(vendorPath).filter(item => 
          fs.statSync(path.join(vendorPath, item)).isDirectory()
        );
        
        for (const model of models) {
          const modelPath = path.join(vendorPath, model);
          const driverInfo = await analyzeDriver(modelPath, domain, category, vendor, model);
          
          if (driverInfo) {
            const key = `${category}-${vendor}-${model}`;
            drivers[key] = driverInfo;
          }
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ Erreur lors du scan de ${domain}:`, error.message);
  }
  
  return drivers;
}

// Analyser un driver spécifique
async function analyzeDriver(driverPath, domain, category, vendor, model) {
  try {
    const driverComposePath = path.join(driverPath, 'driver.compose.json');
    const devicePath = path.join(driverPath, 'device.js');
    
    let driverInfo = {
      id: `${category}-${vendor}-${model}`,
      name: `${vendor} ${model}`,
      class: category,
      capabilities: ['onoff'], // Fallback par défaut
      zigbee: {
        manufacturerName: [],
        modelId: []
      },
      path: path.relative('.', driverPath)
    };
    
    // Lire driver.compose.json s'il existe
    if (fs.existsSync(driverComposePath)) {
      try {
        const composeContent = fs.readFileSync(driverComposePath, 'utf8');
        const compose = JSON.parse(composeContent);
        
        if (compose.capabilities) {
          driverInfo.capabilities = compose.capabilities;
        }
        
        if (compose.zigbee && compose.zigbee.manufacturerName) {
          driverInfo.zigbee.manufacturerName = compose.zigbee.manufacturerName;
        }
        
        if (compose.zigbee && compose.zigbee.modelId) {
          driverInfo.zigbee.modelId = compose.zigbee.modelId;
        }
      } catch (error) {
        console.log(`⚠️ Erreur lecture ${driverComposePath}:`, error.message);
      }
    }
    
    // Lire device.js s'il existe
    if (fs.existsSync(devicePath)) {
      try {
        const deviceContent = fs.readFileSync(devicePath, 'utf8');
        
        // Extraire les informations du device.js
        const manufacturerMatch = deviceContent.match(/manufacturerName.*?\[(.*?)\]/s);
        if (manufacturerMatch) {
          const manufacturers = manufacturerMatch[1].match(/"([^"]+)"/g);
          if (manufacturers) {
            driverInfo.zigbee.manufacturerName = manufacturers.map(m => m.replace(/"/g, ''));
          }
        }
        
        const modelMatch = deviceContent.match(/modelId.*?\[(.*?)\]/s);
        if (modelMatch) {
          const models = modelMatch[1].match(/"([^"]+)"/g);
          if (models) {
            driverInfo.zigbee.modelId = models.map(m => m.replace(/"/g, ''));
          }
        }
      } catch (error) {
        console.log(`⚠️ Erreur lecture ${devicePath}:`, error.message);
      }
    }
    
    return driverInfo;
    
  } catch (error) {
    console.log(`⚠️ Erreur analyse driver ${driverPath}:`, error.message);
    return null;
  }
}

// Générer le nouveau app.js
async function generateNewAppJS() {
  console.log('📝 Génération du nouveau app.js...');
  
  const appJSContent = generateAppJSContent();
  fs.writeFileSync(APP_JS_PATH, appJSContent, 'utf8');
  
  console.log('📄 Nouveau app.js généré');
}

// Générer le contenu de app.js
function generateAppJSContent() {
  const allDrivers = { ...detectedDrivers.tuya, ...detectedDrivers.zigbee };
  const driverKeys = Object.keys(allDrivers);
  
  let requires = [];
  let driverExports = [];
  
  // Générer les requires
  for (const key of driverKeys) {
    const driver = allDrivers[key];
    // Nettoyer le chemin en supprimant les espaces multiples
    const cleanPath = driver.path.replace(/\s+/g, ' ').trim();
    const requirePath = `./${cleanPath}/device`;
    requires.push(`const ${key.replace(/[^a-zA-Z0-9]/g, '_')} = require('${requirePath}');`);
  }
  
  // Générer les exports
  for (const key of driverKeys) {
    const driver = allDrivers[key];
    const varName = key.replace(/[^a-zA-Z0-9]/g, '_');
    const safeKey = `"${key}"`; // Mettre les clés entre guillemets
    driverExports.push(`  ${safeKey}: ${varName},`);
  }
  
  return `'use strict';

const Homey = require('homey');

// Drivers auto-générés
${requires.join('\n')}

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Index dynamique des drivers
    this.driverIndex = this.buildDriverIndex();
    
    this.log(\`Indexé \${Object.keys(this.driverIndex).length} drivers\`);
  }
  
  buildDriverIndex() {
    return {
${driverExports.join('\n')}
    };
  }
  
  getDriverIndex() {
    return this.driverIndex;
  }
  
  reloadDriverIndex() {
    this.driverIndex = this.buildDriverIndex();
    return this.driverIndex;
  }
}

module.exports = TuyaZigbeeApp;
`;
}

// Valider le nouveau app.js
async function validateAppJS() {
  console.log('🔍 Validation du nouveau app.js...');
  
  try {
    // Vérifier la syntaxe
    const content = fs.readFileSync(APP_JS_PATH, 'utf8');
    eval(content); // Test de syntaxe basique
    
    // Vérifier que tous les drivers référencés existent
    const allDrivers = { ...detectedDrivers.tuya, ...detectedDrivers.zigbee };
    
    for (const [key, driver] of Object.entries(allDrivers)) {
      if (!fs.existsSync(driver.path)) {
        console.log(`⚠️ Driver path manquant: ${driver.path}`);
      }
    }
    
    console.log('✅ Validation réussie');
    
  } catch (error) {
    console.error('❌ Erreur de validation:', error.message);
    throw error;
  }
}

// Restaurer l'ancien app.js
async function restoreAppJS() {
  const backupPath = APP_JS_PATH + BACKUP_EXT;
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, APP_JS_PATH);
    console.log('🔄 app.js restauré depuis la sauvegarde');
  }
}

// Exécution si appelé directement
if (require.main === module) {
  completeAppJS().catch(console.error);
}

module.exports = { completeAppJS };
