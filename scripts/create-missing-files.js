// !/usr/bin/env node

/**
 * Script de création automatique des fichiers manquants
 * Basé sur les instructions du dossier fold
 * 
 * Objectifs :
 * - Créer driver.compose.json avec squelette par défaut
 * - Générer icon.svg générique
 * - Créer manifest.json minimal
 * - Ajouter README.md dans les dossiers manquants
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DRIVERS_DIR = 'drivers';
const DOCS_DIR = 'docs';
const SCRIPTS_DIR = 'scripts';

// Templates par défaut
const DEFAULT_DRIVER_COMPOSE = {
  "id": "",
  "class": "",
  "capabilities": ["onoff"],
  "zigbee": {
    "manufacturerName": [],
    "modelId": []
  },
  "icon": "/assets/icon.svg",
  "images": {
    "small": "/assets/small.png",
    "large": "/assets/large.png"
  }
};

const DEFAULT_ICON_SVG = `<svg xmlns = "http://www.w3.org/2000/svg" width = "24" height = "24" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke-width = "2" stroke-linecap = "round" stroke-linejoin = "round">
  <rect x = "3" y = "3" width = "18" height = "18" rx = "2" ry = "2"/>
  <circle cx = "8.5" cy = "8.5" r = "1.5"/>
  <polyline points = "21,15 16,10 5,21"/>
</svg>`;

const DEFAULT_MANIFEST = {
  "name": "",
  "version": "1.0.0",
  "description": "",
  "author": "dlnraja",
  "license": "MIT"
};

const DEFAULT_README = `// Driver {DRIVER_NAME}

#// Description
Driver pour appareil {CATEGORY} {VENDOR} {MODEL}

#// Capabilities
- onoff (par défaut)

#// Support
- Test mode only
- Non publié sur Homey Store

#// Installation
1. Copier ce dossier dans \`drivers/{DOMAIN}/{CATEGORY}/{VENDOR}/{MODEL}/\`
2. Redémarrer l'app Homey
3. L'appareil sera automatiquement détecté

#// Configuration
Modifier \`driver.compose.json\` pour ajuster les capabilities et paramètres Zigbee.

#// Support
Issues et PRs sur [GitHub](https://github.com/dlnraja/com.tuya.zigbee)
`;

// Fonction principale
async function createMissingFiles() {
  console.log('🚀 Début de la création des fichiers manquants...');
  
  try {
    // 1. Créer les dossiers de base s'ils n'existent pas
    await createBaseDirectories();
    
    // 2. Scanner et créer les fichiers manquants dans drivers/
    await scanAndCreateDriverFiles();
    
    // 3. Créer les README manquants
    await createMissingReadmes();
    
    // 4. Créer les assets manquants
    await createMissingAssets();
    
    console.log('✅ Fichiers manquants créés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error.message);
    throw error;
  }
}

// Créer les dossiers de base
async function createBaseDirectories() {
  const dirs = [DOCS_DIR, SCRIPTS_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Dossier créé: ${dir}/`);
    }
  }
}

// Scanner et créer les fichiers manquants dans drivers/
async function scanAndCreateDriverFiles() {
  if (!fs.existsSync(DRIVERS_DIR)) {
    console.log('⚠️ Dossier drivers/ non trouvé, création...');
    fs.mkdirSync(DRIVERS_DIR, { recursive: true });
    return;
  }
  
  const domains = ['tuya', 'zigbee'];
  
  for (const domain of domains) {
    const domainPath = path.join(DRIVERS_DIR, domain);
    if (fs.existsSync(domainPath)) {
      await scanDomainForMissingFiles(domainPath, domain);
    }
  }
}

// Scanner un domaine pour les fichiers manquants
async function scanDomainForMissingFiles(domainPath, domain) {
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
          await createMissingDriverFiles(modelPath, domain, category, vendor, model);
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ Erreur lors du scan de ${domain}:`, error.message);
  }
}

// Créer les fichiers manquants pour un driver
async function createMissingDriverFiles(driverPath, domain, category, vendor, model) {
  const driverId = `${category}-${vendor}-${model}`;
  
  // 1. Créer driver.compose.json s'il manque
  const composePath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(composePath)) {
    const compose = { ...DEFAULT_DRIVER_COMPOSE };
    compose.id = driverId;
    compose.class = category;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`📄 driver.compose.json créé: ${driverId}`);
  }
  
  // 2. Créer icon.svg s'il manque
  const iconPath = path.join(driverPath, 'assets', 'icon.svg');
  if (!fs.existsSync(iconPath)) {
    const assetsDir = path.dirname(iconPath);
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    fs.writeFileSync(iconPath, DEFAULT_ICON_SVG, 'utf8');
    console.log(`🎨 icon.svg créé: ${driverId}`);
  }
  
  // 3. Créer manifest.json s'il manque
  const manifestPath = path.join(driverPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const manifest = { ...DEFAULT_MANIFEST };
    manifest.name = `${vendor} ${model}`;
    manifest.description = `Driver pour ${category} ${vendor} ${model}`;
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`📋 manifest.json créé: ${driverId}`);
  }
  
  // 4. Créer README.md s'il manque
  const readmePath = path.join(driverPath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const readme = DEFAULT_README
      .replace(/{DRIVER_NAME}/g, driverId)
      .replace(/{CATEGORY}/g, category)
      .replace(/{VENDOR}/g, vendor)
      .replace(/{MODEL}/g, model)
      .replace(/{DOMAIN}/g, domain);
    
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log(`📖 README.md créé: ${driverId}`);
  }
}

// Créer les README manquants
async function createMissingReadmes() {
  // README dans docs/
  const docsReadmePath = path.join(DOCS_DIR, 'README.md');
  if (!fs.existsSync(docsReadmePath)) {
    const docsReadme = `// Documentation Tuya Zigbee

#// 📚 Guides et références

##// Drivers
- [Structure des drivers](./drivers-structure.md)
- [Capabilities supportées](./capabilities.md)
- [Clusters Zigbee](./clusters.md)

##// Développement
- [Guide de contribution](./CONTRIBUTING.md)
- [Standards de code](./code-standards.md)
- [Tests et validation](./testing.md)

##// Déploiement
- [Installation locale](./local-installation.md)
- [Configuration](./configuration.md)
- [Troubleshooting](./troubleshooting.md)

#// 🔗 Liens utiles
- [Dashboard GitHub Pages](https://dlnraja.github.io/com.tuya.zigbee/)
- [Repository GitHub](https://github.com/dlnraja/com.tuya.zigbee)
- [Issues et PRs](https://github.com/dlnraja/com.tuya.zigbee/issues)
`;
    
    fs.writeFileSync(docsReadmePath, docsReadme, 'utf8');
    console.log('📖 README.md créé dans docs/');
  }
  
  // README dans scripts/
  const scriptsReadmePath = path.join(SCRIPTS_DIR, 'README.md');
  if (!fs.existsSync(scriptsReadmePath)) {
    const scriptsReadme = `// Scripts d'automatisation

#// 🚀 Scripts principaux

##// Pipeline complète
- \`mega-progressive.js\` - Pipeline progressive avec pushes intermédiaires
- \`mega-sources-complete.js\` - Pipeline complète avec sources wildcard

##// Gestion des drivers
- \`complete-app-js.js\` - Complétion automatique de app.js
- \`create-missing-files.js\` - Création des fichiers manquants
- \`enrich-drivers.js\` - Enrichissement des drivers existants
- \\reorganize-drivers.js\` - Réorganisation de la structure

##// Sources externes
- \`sources-wildcard.js\` - Collecte depuis toutes les sources
- \`analyze-external-sources.js\` - Analyse des sources externes

##// Validation et diagnostic
- \`validate-driver-structure.js\` - Validation de la structure
- \`diagnose-drivers.js\` - Diagnostic des drivers
- \`fix-driver-structure.js\` - Correction de la structure

#// 🔧 Utilisation

\`\`\`bash
// Pipeline complète
node scripts/mega-progressive.js

// Complétion app.js
node scripts/complete-app-js.js

// Création fichiers manquants
node scripts/create-missing-files.js
\`\`\`

#// 📋 Dépendances
- Node.js 18+
- npm packages: homey, homey-zigbeedriver, zigbee-clusters
`;
    
    fs.writeFileSync(scriptsReadmePath, scriptsReadme, 'utf8');
    console.log('📖 README.md créé dans scripts/');
  }
}

// Créer les assets manquants
async function createMissingAssets() {
  const assetsDir = 'assets';
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Créer icon.svg principal s'il manque
  const mainIconPath = path.join(assetsDir, 'icon.svg');
  if (!fs.existsSync(mainIconPath)) {
    fs.writeFileSync(mainIconPath, DEFAULT_ICON_SVG, 'utf8');
    console.log('🎨 icon.svg principal créé');
  }
  
  // Créer le dossier images s'il manque
  const imagesDir = path.join(assetsDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('📁 Dossier assets/images/ créé');
  }
}

// Exécution si appelé directement
if (require.main === module) {
  createMissingFiles().catch(console.error);
}

module.exports = { createMissingFiles };
