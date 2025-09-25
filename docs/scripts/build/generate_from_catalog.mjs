#!/usr/bin/env node

/**
 * 🚀 GÉNÉRATEUR DE DRIVERS DEPUIS LE CATALOG SOT
 * 
 * Parcourt catalog/<cat>/<vendor>/<productnontechnique>/
 * Produit /drivers/<vendor>_<category>_<productnontechnique>_<techcode>/
 * 
 * Usage: DEBUG=1 node scripts/build/generate_from_catalog.mjs
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    toSlugHuman, 
    buildDriverSlug, 
    extractPrimaryTechCode,
    normalizeCategory,
    normalizeVendor 
} from './utils/slug.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG = process.env.DEBUG === '1';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

class CatalogDriverGenerator {
  constructor() {
    this.catalogPath = path.join(PROJECT_ROOT, 'catalog');
    this.driversPath = path.join(PROJECT_ROOT, 'drivers');
    this.stats = {
      total: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
      categories: new Set(),
      vendors: new Set()
    };
  }

  async run() {
    try {
      console.log('🚀 GÉNÉRATEUR DE DRIVERS DEPUIS LE CATALOG SOT');
      console.log(`📁 Catalog: ${this.catalogPath}`);
      console.log(`📁 Drivers: ${this.driversPath}`);
      
      if (!(await fs.pathExists(this.catalogPath))) {
        console.log('⚠️  Dossier catalog/ non trouvé, création...');
        await fs.ensureDir(this.catalogPath);
        console.log('✅ Dossier catalog/ créé');
        return;
      }

      // 1. Analyser la structure du catalog
      await this.analyzeCatalog();
      
      // 2. Générer les drivers
      await this.generateDrivers();
      
      // 3. Afficher les statistiques
      this.displayStats();
      
      console.log('✅ GÉNÉRATION TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }
  }

  async analyzeCatalog() {
    console.log('\n🔍 ANALYSE DE LA STRUCTURE DU CATALOG...');
    
    const categories = await fs.readdir(this.catalogPath);
    
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      const categoryStats = await fs.stat(categoryPath);
      
      if (categoryStats.isDirectory()) {
        this.stats.categories.add(category);
        
        const vendors = await fs.readdir(categoryPath);
        for (const vendor of vendors) {
          const vendorPath = path.join(categoryPath, vendor);
          const vendorStats = await fs.stat(vendorPath);
          
          if (vendorStats.isDirectory()) {
            this.stats.vendors.add(vendor);
            
            const products = await fs.readdir(vendorPath);
            for (const product of products) {
              const productPath = path.join(vendorPath, product);
              const productStats = await fs.stat(productPath);
              
              if (productStats.isDirectory()) {
                this.stats.total++;
                
                if (DEBUG) {
                  console.log(`  📁 ${category}/${vendor}/${product}`);
                }
              }
            }
          }
        }
      }
    }
    
    console.log(`📊 Catalog analysé: ${this.stats.total} produits, ${this.stats.categories.size} catégories, ${this.stats.vendors.size} vendors`);
  }

  async generateDrivers() {
    console.log('\n🔄 GÉNÉRATION DES DRIVERS...');
    
    const categories = await fs.readdir(this.catalogPath);
    
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      const categoryStats = await fs.stat(categoryPath);
      
      if (categoryStats.isDirectory()) {
        await this.generateCategoryDrivers(category, categoryPath);
      }
    }
  }

  async generateCategoryDrivers(category, categoryPath) {
    if (DEBUG) console.log(`\n📁 Traitement de la catégorie: ${category}`);
    
    const vendors = await fs.readdir(categoryPath);
    
    for (const vendor of vendors) {
      const vendorPath = path.join(categoryPath, vendor);
      const vendorStats = await fs.stat(vendorPath);
      
      if (vendorStats.isDirectory()) {
        await this.generateVendorDrivers(category, vendor, vendorPath);
      }
    }
  }

  async generateVendorDrivers(category, vendor, vendorPath) {
    if (DEBUG) console.log(`  🏭 Traitement du vendor: ${vendor}`);
    
    const products = await fs.readdir(vendorPath);
    
    for (const product of products) {
      const productPath = path.join(vendorPath, product);
      const productStats = await fs.stat(productPath);
      
      if (productStats.isDirectory()) {
        await this.generateProductDriver(category, vendor, product, productPath);
      }
    }
  }

  async generateProductDriver(category, vendor, product, productPath) {
    try {
      // Lire le metadata.json du catalog
      const metadataPath = path.join(productPath, 'metadata.json');
      let metadata = {};
      
      if (await fs.pathExists(metadataPath)) {
        metadata = await fs.readJson(metadataPath);
      }
      
      // Générer le slug du driver
      const techCode = metadata.techCode || 'unknown';
      const driverSlug = `${vendor}_${category}_${product}_${techCode}`;
      
      if (DEBUG) {
        console.log(`    📦 ${product} → ${driverSlug}`);
      }
      
      // Déterminer le chemin de destination
      const targetPath = path.join(this.driversPath, 'tuya_zigbee', category, driverSlug);
      
      // Vérifier si le driver existe déjà
      if (await fs.pathExists(targetPath)) {
        if (DEBUG) console.log(`      ⚠️  Driver existant, mise à jour...`);
        this.stats.skipped++;
      } else {
        if (DEBUG) console.log(`      ✅ Nouveau driver, création...`);
        this.stats.generated++;
      }
      
      // Créer la structure du driver
      await this.createDriverStructure(targetPath, metadata, productPath);
      
    } catch (error) {
      console.error(`      ❌ Erreur pour ${product}:`, error.message);
      this.stats.errors++;
    }
  }

  async createDriverStructure(targetPath, metadata, sourcePath) {
    // Créer le dossier du driver
    await fs.ensureDir(targetPath);
    
    // 1. driver.compose.json
    const driverCompose = this.generateDriverCompose(metadata);
    await fs.writeJson(path.join(targetPath, 'driver.compose.json'), driverCompose, { spaces: 2 });
    
    // 2. device.js
    const deviceJs = this.generateDeviceJs(metadata);
    await fs.writeFile(path.join(targetPath, 'device.js'), deviceJs);
    
    // 3. driver.js
    const driverJs = this.generateDriverJs(metadata);
    await fs.writeFile(path.join(targetPath, 'driver.js'), driverJs);
    
    // 4. metadata.json
    await fs.writeJson(path.join(targetPath, 'metadata.json'), metadata, { spaces: 2 });
    
    // 5. README.md
    const readme = this.generateReadme(metadata);
    await fs.writeFile(path.join(targetPath, 'README.md'), readme);
    
    // 6. Copier les assets s'ils existent
    await this.copyAssets(sourcePath, targetPath);
    
    // 7. Créer les assets manquants
    await this.createMissingAssets(targetPath, metadata);
  }

  generateDriverCompose(metadata) {
    return {
      id: metadata.driverId || 'generic_tuya_zigbee',
      name: {
        en: metadata.name?.en || 'Generic Tuya Zigbee Device',
        fr: metadata.name?.fr || 'Dispositif Tuya Zigbee Générique',
        nl: metadata.name?.nl || 'Generiek Tuya Zigbee Apparaat',
        ta: metadata.name?.ta || 'பொதுவான துயா ஜிக்பீ சாதனம்'
      },
      description: {
        en: metadata.description?.en || 'Universal Tuya Zigbee device driver',
        fr: metadata.description?.fr || 'Driver universel pour dispositif Tuya Zigbee',
        nl: metadata.description?.nl || 'Universele Tuya Zigbee apparaat driver',
        ta: metadata.description?.ta || 'உலகளாவிய துயா ஜிக்பீ சாதன டிரைவர்'
      },
      category: metadata.category || ['other'],
      capabilities: metadata.capabilities || ['onoff'],
      capabilitiesOptions: metadata.capabilitiesOptions || {},
      images: {
        small: 'assets/small.png',
        large: 'assets/large.png',
        xlarge: 'assets/xlarge.png'
      },
      icon: 'assets/icon.svg'
    };
  }

  generateDeviceJs(metadata) {
    return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${metadata.className || 'GenericTuyaZigbeeDevice'} extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    
    // Log device initialization
    this.log('Device initialized:', this.getData().id);
    
    // Register capabilities based on metadata
    ${this.generateCapabilityRegistrations(metadata)}
  }
  
  ${this.generateCapabilityRegistrations(metadata)}
  
  async onDeleted() {
    this.log('Device deleted:', this.getData().id);
  }
}

module.exports = ${metadata.className || 'GenericTuyaZigbeeDevice'};
`;
  }

  generateDriverJs(metadata) {
    return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${metadata.driverClassName || 'GenericTuyaZigbeeDriver'} extends ZigBeeDriver {
  
  async onNodeInit({ zclNode, hasChildren }) {
    await super.onNodeInit({ zclNode, hasChildren });
    
    // Log driver initialization
    this.log('Driver initialized for:', this.getData().id);
  }
  
  async onPairListDevices() {
    return [];
  }
}

module.exports = ${metadata.driverClassName || 'GenericTuyaZigbeeDriver'};
`;
  }

  generateCapabilityRegistrations(metadata) {
    if (!metadata.capabilities || metadata.capabilities.length === 0) {
      return '';
    }
    
    let code = '';
    for (const capability of metadata.capabilities) {
      code += `
  async register${capability.charAt(0).toUpperCase() + capability.slice(1)}Capability() {
    try {
      await this.registerCapability('${capability}', 'genOnOff', {
        get: 'onOff',
        set: 'toggle',
        setParser: () => ({}),
        report: 'onOff',
        reportParser: (value) => value === 1,
      });
      this.log('Capability ${capability} registered');
    } catch (error) {
      this.error('Failed to register ${capability} capability:', error);
    }
  }`;
    }
    
    return code;
  }

  generateReadme(metadata) {
    return `# ${metadata.name?.en || 'Generic Tuya Zigbee Device'}

## Description

${metadata.description?.en || 'Universal Tuya Zigbee device driver'}

## Capabilities

${(metadata.capabilities || ['onoff']).map(cap => `- \`${cap}\``).join('\n')}

## Technical Details

- **Vendor**: ${metadata.vendor || 'Unknown'}
- **Model**: ${metadata.model || 'Unknown'}
- **Tech Code**: ${metadata.techCode || 'Unknown'}
- **Category**: ${metadata.category || 'other'}

## Installation

This driver is automatically generated from the catalog SOT.

## Support

For support, please refer to the main project documentation.
`;
  }

  async copyAssets(sourcePath, targetPath) {
    const assetsPath = path.join(sourcePath, 'assets');
    
    if (await fs.pathExists(assetsPath)) {
      const targetAssetsPath = path.join(targetPath, 'assets');
      await fs.ensureDir(targetAssetsPath);
      
      try {
        await fs.copy(assetsPath, targetAssetsPath);
        if (DEBUG) console.log(`        📁 Assets copiés`);
      } catch (error) {
        if (DEBUG) console.log(`        ⚠️  Erreur copie assets: ${error.message}`);
      }
    }
  }

  async createMissingAssets(targetPath, metadata) {
    const assetsPath = path.join(targetPath, 'assets');
    await fs.ensureDir(assetsPath);
    
    // Créer icon.svg basique
    const iconSvg = this.generateBasicIcon(metadata);
    await fs.writeFile(path.join(assetsPath, 'icon.svg'), iconSvg);
    
    // Créer images PNG basiques (placeholders)
    await this.createPlaceholderImages(assetsPath);
  }

  generateBasicIcon(metadata) {
    const category = metadata.category?.[0] || 'other';
    const color = this.getCategoryColor(category);
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${color}" rx="20"/>
  <circle cx="128" cy="128" r="80" fill="white" opacity="0.9"/>
  <text x="128" y="140" text-anchor="middle" fill="${color}" font-size="24" font-weight="bold">${category.toUpperCase().charAt(0)}</text>
  <text x="128" y="200" text-anchor="middle" fill="white" font-size="16">${metadata.vendor || 'TUYA'}</text>
</svg>`;
  }

  getCategoryColor(category) {
    const colors = {
      light: '#FFD700',
      switch: '#3498DB',
      sensor: '#E74C3C',
      cover: '#9B59B6',
      lock: '#2ECC71',
      ac: '#E67E22',
      heater: '#E74C3C',
      fan: '#1ABC9C',
      other: '#95A5A6'
    };
    
    for (const [key, color] of Object.entries(colors)) {
      if (category.includes(key)) return color;
    }
    
    return colors.other;
  }

  async createPlaceholderImages(assetsPath) {
    // Créer des images PNG basiques (placeholders)
    // En production, ces images seraient générées avec une vraie lib PNG
    
    const placeholderContent = `# Placeholder PNG - À remplacer par de vraies images
# Dimensions: 75x75 (small), 500x500 (large), 1000x1000 (xlarge)
# Fond blanc requis pour Homey App Store`;
    
    await fs.writeFile(path.join(assetsPath, 'small.png'), placeholderContent);
    await fs.writeFile(path.join(assetsPath, 'large.png'), placeholderContent);
    await fs.writeFile(path.join(assetsPath, 'xlarge.png'), placeholderContent);
    
    if (DEBUG) console.log(`        🖼️  Images placeholder créées`);
  }

  displayStats() {
    console.log('\n📊 STATISTIQUES DE GÉNÉRATION:');
    console.log(`📁 Total produits catalog: ${this.stats.total}`);
    console.log(`✅ Drivers générés: ${this.stats.generated}`);
    console.log(`⏭️  Drivers mis à jour: ${this.stats.skipped}`);
    console.log(`❌ Erreurs: ${this.stats.errors}`);
    console.log(`🏷️  Catégories: ${this.stats.categories.size}`);
    console.log(`🏭 Vendors: ${this.stats.vendors.size}`);
  }
}

// Exécuter le générateur
const generator = new CatalogDriverGenerator();
generator.run().catch(console.error);
