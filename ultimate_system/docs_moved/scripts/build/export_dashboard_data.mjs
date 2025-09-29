#!/usr/bin/env node

/**
 * 📊 EXPORTEUR DE DONNÉES POUR DASHBOARD DYNAMIQUE
 * 
 * Scanne catalog/ + drivers/ et génère docs/data/*.json
 * Utilise les utilitaires de slug du brief "béton"
 * 
 * Usage: DEBUG=1 node scripts/build/export_dashboard_data.mjs
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

class DashboardDataExporter {
  constructor() {
    this.catalogPath = path.join(PROJECT_ROOT, 'catalog');
    this.driversPath = path.join(PROJECT_ROOT, 'drivers');
    this.outputPath = path.join(PROJECT_ROOT, 'docs', 'data');
    
    this.data = {
      drivers: {},
      sources: {},
      kpi: {},
      categories: {},
      vendors: {}
    };
  }

  async run() {
    try {
      console.log('📊 EXPORTEUR DE DONNÉES POUR DASHBOARD DYNAMIQUE');
      console.log(`📁 Catalog: ${this.catalogPath}`);
      console.log(`📁 Drivers: ${this.driversPath}`);
      console.log(`📁 Output: ${this.outputPath}`);
      
      // 1. Créer le dossier de sortie
      await fs.ensureDir(this.outputPath);
      
      // 2. Analyser le catalog
      await this.analyzeCatalog();
      
      // 3. Analyser les drivers
      await this.analyzeDrivers();
      
      // 4. Calculer les KPIs
      this.calculateKPIs();
      
      // 5. Exporter les données
      await this.exportData();
      
      console.log('✅ EXPORT TERMINÉ !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }
  }

  async analyzeCatalog() {
    console.log('\n🔍 ANALYSE DU CATALOG...');
    
    if (!(await fs.pathExists(this.catalogPath))) {
      console.log('⚠️  Dossier catalog/ non trouvé');
      return;
    }
    
    const categories = await fs.readdir(this.catalogPath);
    
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      const categoryStats = await fs.stat(categoryPath);
      
      if (categoryStats.isDirectory()) {
        await this.analyzeCatalogCategory(category, categoryPath);
      }
    }
  }

  async analyzeCatalogCategory(category, categoryPath) {
    if (DEBUG) console.log(`  📁 Catégorie: ${category}`);
    
    if (!this.data.categories[category]) {
      this.data.categories[category] = {
        name: category,
        count: 0,
        vendors: new Set(),
        products: []
      };
    }
    
    const vendors = await fs.readdir(categoryPath);
    
    for (const vendor of vendors) {
      const vendorPath = path.join(categoryPath, vendor);
      const vendorStats = await fs.stat(vendorPath);
      
      if (vendorStats.isDirectory()) {
        await this.analyzeCatalogVendor(category, vendor, vendorPath);
      }
    }
  }

  async analyzeCatalogVendor(category, vendor, vendorPath) {
    if (DEBUG) console.log(`    🏭 Vendor: ${vendor}`);
    
    if (!this.data.vendors[vendor]) {
      this.data.vendors[vendor] = {
        name: vendor,
        count: 0,
        categories: new Set(),
        products: []
      };
    }
    
    const products = await fs.readdir(vendorPath);
    
    for (const product of products) {
      const productPath = path.join(vendorPath, product);
      const productStats = await fs.stat(productPath);
      
      if (productStats.isDirectory()) {
        await this.analyzeCatalogProduct(category, vendor, product, productPath);
      }
    }
  }

  async analyzeCatalogProduct(category, vendor, product, productPath) {
    if (DEBUG) console.log(`      📦 Produit: ${product}`);
    
    // Lire metadata.json
    const metadataPath = path.join(productPath, 'metadata.json');
    let metadata = {};
    
    if (await fs.pathExists(metadataPath)) {
      try {
        metadata = await fs.readJson(metadataPath);
      } catch (error) {
        if (DEBUG) console.log(`        ⚠️  Erreur lecture metadata: ${error.message}`);
      }
    }
    
    // Ajouter aux statistiques
    this.data.categories[category].count++;
    this.data.categories[category].vendors.add(vendor);
    this.data.categories[category].products.push({
      name: product,
      vendor: vendor,
      metadata: metadata
    });
    
    this.data.vendors[vendor].count++;
    this.data.vendors[vendor].categories.add(category);
    this.data.vendors[vendor].products.push({
      name: product,
      category: category,
      metadata: metadata
    });
  }

  async analyzeDrivers() {
    console.log('\n🔍 ANALYSE DES DRIVERS...');
    
    if (!(await fs.pathExists(this.driversPath))) {
      console.log('⚠️  Dossier drivers/ non trouvé');
      return;
    }
    
    const driverTypes = await fs.readdir(this.driversPath);
    
    for (const driverType of driverTypes) {
      const driverTypePath = path.join(this.driversPath, driverType);
      const driverTypeStats = await fs.stat(driverTypePath);
      
      if (driverTypeStats.isDirectory()) {
        await this.analyzeDriverType(driverType, driverTypePath);
      }
    }
  }

  async analyzeDriverType(driverType, driverTypePath) {
    if (DEBUG) console.log(`  📁 Type de driver: ${driverType}`);
    
    if (!this.data.drivers[driverType]) {
      this.data.drivers[driverType] = {
        name: driverType,
        count: 0,
        categories: {},
        totalDrivers: 0
      };
    }
    
    const categories = await fs.readdir(driverTypePath);
    
    for (const category of categories) {
      const categoryPath = path.join(driverTypePath, category);
      const categoryStats = await fs.stat(categoryPath);
      
      if (categoryStats.isDirectory()) {
        await this.analyzeDriverCategory(driverType, category, categoryPath);
      }
    }
  }

  async analyzeDriverCategory(driverType, category, categoryPath) {
    if (DEBUG) console.log(`    📁 Catégorie: ${category}`);
    
    if (!this.data.drivers[driverType].categories[category]) {
      this.data.drivers[driverType].categories[category] = {
        name: category,
        count: 0,
        drivers: []
      };
    }
    
    const drivers = await fs.readdir(categoryPath);
    
    for (const driver of drivers) {
      const driverPath = path.join(categoryPath, driver);
      const driverStats = await fs.stat(driverPath);
      
      if (driverStats.isDirectory()) {
        await this.analyzeDriver(driverType, category, driver, driverPath);
      }
    }
  }

  async analyzeDriver(driverType, category, driver, driverPath) {
    if (DEBUG) console.log(`      🚗 Driver: ${driver}`);
    
    // Vérifier les fichiers requis
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      if (!(await fs.pathExists(path.join(driverPath, file)))) {
        missingFiles.push(file);
      }
    }
    
    // Vérifier les assets
    const assetsPath = path.join(driverPath, 'assets');
    const hasAssets = await fs.pathExists(assetsPath);
    const hasIcon = hasAssets && await fs.pathExists(path.join(assetsPath, 'icon.svg'));
    const hasImages = hasAssets && 
                     await fs.pathExists(path.join(assetsPath, 'small.png')) &&
                     await fs.pathExists(path.join(assetsPath, 'large.png')) &&
                     await fs.pathExists(path.join(assetsPath, 'xlarge.png'));
    
    const driverInfo = {
      name: driver,
      path: driver,
      hasRequiredFiles: missingFiles.length === 0,
      missingFiles: missingFiles,
      hasAssets: hasAssets,
      hasIcon: hasIcon,
      hasImages: hasImages,
      isValid: missingFiles.length === 0 && hasIcon && hasImages
    };
    
    this.data.drivers[driverType].categories[category].drivers.push(driverInfo);
    this.data.drivers[driverType].categories[category].count++;
    this.data.drivers[driverType].totalDrivers++;
  }

  calculateKPIs() {
    console.log('\n📊 CALCUL DES KPIs...');
    
    // Statistiques globales
    this.data.kpi = {
      timestamp: new Date().toISOString(),
      total: {
        catalogProducts: Object.values(this.data.categories).reduce((sum, cat) => sum + cat.count, 0),
        drivers: Object.values(this.data.drivers).reduce((sum, type) => sum + type.totalDrivers, 0),
        categories: Object.keys(this.data.categories).length,
        vendors: Object.keys(this.data.vendors).length
      },
      drivers: {},
      catalog: {},
      compliance: {}
    };
    
    // Statistiques par type de driver
    for (const [driverType, data] of Object.entries(this.data.drivers)) {
      this.data.kpi.drivers[driverType] = {
        total: data.totalDrivers,
        valid: 0,
        invalid: 0,
        categories: Object.keys(data.categories).length
      };
      
      for (const categoryData of Object.values(data.categories)) {
        for (const driver of categoryData.drivers) {
          if (driver.isValid) {
            this.data.kpi.drivers[driverType].valid++;
          } else {
            this.data.kpi.drivers[driverType].invalid++;
          }
        }
      }
    }
    
    // Statistiques du catalog
    this.data.kpi.catalog = {
      totalProducts: this.data.kpi.total.catalogProducts,
      totalCategories: this.data.kpi.total.categories,
      totalVendors: this.data.kpi.total.vendors,
      topCategories: Object.entries(this.data.categories)
        .map(([name, data]) => ({ name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topVendors: Object.entries(this.data.vendors)
        .map(([name, data]) => ({ name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
    
    // Conformité SDK3
    this.data.kpi.compliance = {
      sdk3Ready: 0,
      sdk3NotReady: 0,
      percentage: 0
    };
    
    for (const driverTypeData of Object.values(this.data.drivers)) {
      this.data.kpi.compliance.sdk3Ready += driverTypeData.categories[category]?.drivers.filter(d => d.isValid).length || 0;
      this.data.kpi.compliance.sdk3NotReady += driverTypeData.categories[category]?.drivers.filter(d => !d.isValid).length || 0;
    }
    
    if (this.data.kpi.compliance.sdk3Ready + this.data.kpi.compliance.sdk3NotReady > 0) {
      this.data.kpi.compliance.percentage = Math.round(
        (this.data.kpi.compliance.sdk3Ready / (this.data.kpi.compliance.sdk3Ready + this.data.kpi.compliance.sdk3NotReady)) * 100
      );
    }
  }

  async exportData() {
    console.log('\n📤 EXPORT DES DONNÉES...');
    
    // Convertir les Sets en Arrays pour la sérialisation JSON
    this.prepareDataForExport();
    
    // 1. drivers.json
    const driversPath = path.join(this.outputPath, 'drivers.json');
    await fs.writeJson(driversPath, this.data.drivers, { spaces: 2 });
    console.log('✅ drivers.json exporté');
    
    // 2. sources.json
    const sourcesPath = path.join(this.outputPath, 'sources.json');
    await fs.writeJson(sourcesPath, this.data.sources, { spaces: 2 });
    console.log('✅ sources.json exporté');
    
    // 3. kpi.json
    const kpiPath = path.join(this.outputPath, 'kpi.json');
    await fs.writeJson(kpiPath, this.data.kpi, { spaces: 2 });
    console.log('✅ kpi.json exporté');
    
    // 4. categories.json
    const categoriesPath = path.join(this.outputPath, 'categories.json');
    await fs.writeJson(categoriesPath, this.data.categories, { spaces: 2 });
    console.log('✅ categories.json exporté');
    
    // 5. vendors.json
    const vendorsPath = path.join(this.outputPath, 'vendors.json');
    await fs.writeJson(vendorsPath, this.data.vendors, { spaces: 2 });
    console.log('✅ vendors.json exporté');
    
    // 6. summary.json (résumé global)
    const summaryPath = path.join(this.outputPath, 'summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      total: this.data.kpi.total,
      compliance: this.data.kpi.compliance,
      topCategories: this.data.kpi.catalog.topCategories.slice(0, 5),
      topVendors: this.data.kpi.catalog.topVendors.slice(0, 5)
    };
    await fs.writeJson(summaryPath, summary, { spaces: 2 });
    console.log('✅ summary.json exporté');
  }

  prepareDataForExport() {
    // Convertir les Sets en Arrays
    for (const category of Object.values(this.data.categories)) {
      category.vendors = Array.from(category.vendors);
    }
    
    for (const vendor of Object.values(this.data.vendors)) {
      vendor.categories = Array.from(vendor.categories);
    }
  }
}

// Exécuter l'exporteur
const exporter = new DashboardDataExporter();
exporter.run().catch(console.error);
