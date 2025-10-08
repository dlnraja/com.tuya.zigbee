#!/usr/bin/env node

/**
 * 🖼️ VALIDATEUR D'ASSETS POUR CONFORMITÉ SDK3
 * 
 * Vérifie icon.svg + images/{small,large,xlarge}.png pour chaque driver
 * 
 * Usage: DEBUG=1 node scripts/build/validate_assets.mjs
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG = process.env.DEBUG === '1';
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

class AssetsValidator {
  constructor() {
    this.driversPath = path.join(PROJECT_ROOT, 'drivers');
    this.stats = {
      total: 0,
      valid: 0,
      invalid: 0,
      missingIcon: 0,
      missingImages: 0,
      missingAssets: 0,
      categories: {}
    };
  }

  async run() {
    try {
      console.log('🖼️ VALIDATEUR D\'ASSETS POUR CONFORMITÉ SDK3');
      console.log(`📁 Drivers: ${this.driversPath}`);
      
      // 1. Analyser tous les drivers
      await this.analyzeAllDrivers();
      
      // 2. Afficher les statistiques
      this.displayStats();
      
      // 3. Générer le rapport
      await this.generateReport();
      
      console.log('✅ VALIDATION TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      process.exit(1);
    }
  }

  async analyzeAllDrivers() {
    console.log('\n🔍 ANALYSE DE TOUS LES DRIVERS...');
    
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
    
    if (!this.stats.categories[driverType]) {
      this.stats.categories[driverType] = {
        total: 0,
        valid: 0,
        invalid: 0,
        missingIcon: 0,
        missingImages: 0,
        missingAssets: 0
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
    
    this.stats.total++;
    this.stats.categories[driverType].total++;
    
    // Vérifier les assets
    const assetsPath = path.join(driverPath, 'assets');
    const hasAssets = await fs.pathExists(assetsPath);
    
    if (!hasAssets) {
      this.stats.missingAssets++;
      this.stats.categories[driverType].missingAssets++;
      this.stats.invalid++;
      this.stats.categories[driverType].invalid++;
      
      if (DEBUG) console.log(`        ❌ Dossier assets manquant`);
      return;
    }
    
    // Vérifier icon.svg
    const iconPath = path.join(assetsPath, 'icon.svg');
    const hasIcon = await fs.pathExists(iconPath);
    
    if (!hasIcon) {
      this.stats.missingIcon++;
      this.stats.categories[driverType].missingIcon++;
      if (DEBUG) console.log(`        ❌ icon.svg manquant`);
    }
    
    // Vérifier les images PNG
    const smallPath = path.join(assetsPath, 'small.png');
    const largePath = path.join(assetsPath, 'large.png');
    const xlargePath = path.join(assetsPath, 'xlarge.png');
    
    const hasSmall = await fs.pathExists(smallPath);
    const hasLarge = await fs.pathExists(largePath);
    const hasXlarge = await fs.pathExists(xlargePath);
    
    if (!hasSmall || !hasLarge || !hasXlarge) {
      this.stats.missingImages++;
      this.stats.categories[driverType].missingImages++;
      if (DEBUG) console.log(`        ❌ Images PNG manquantes: small=${hasSmall}, large=${hasLarge}, xlarge=${hasXlarge}`);
    }
    
    // Vérifier la conformité complète
    const isValid = hasIcon && hasSmall && hasLarge && hasXlarge;
    
    if (isValid) {
      this.stats.valid++;
      this.stats.categories[driverType].valid++;
      if (DEBUG) console.log(`        ✅ Assets conformes`);
    } else {
      this.stats.invalid++;
      this.stats.categories[driverType].invalid++;
    }
    
    // Vérifier les dimensions des images (si possible)
    if (isValid) {
      await this.validateImageDimensions(smallPath, largePath, xlargePath);
    }
  }

  async validateImageDimensions(smallPath, largePath, xlargePath) {
    try {
      // Note: En production, on utiliserait une vraie lib pour vérifier les dimensions
      // Pour l'instant, on vérifie juste que les fichiers existent et ont une taille > 0
      
      const smallStats = await fs.stat(smallPath);
      const largeStats = await fs.stat(largePath);
      const xlargeStats = await fs.stat(xlargePath);
      
      if (smallStats.size === 0 || largeStats.size === 0 || xlargeStats.size === 0) {
        if (DEBUG) console.log(`        ⚠️  Une ou plusieurs images ont une taille de 0 bytes`);
      }
      
    } catch (error) {
      if (DEBUG) console.log(`        ⚠️  Erreur lors de la validation des dimensions: ${error.message}`);
    }
  }

  displayStats() {
    console.log('\n📊 STATISTIQUES DE VALIDATION DES ASSETS:');
    console.log(`📁 Total drivers: ${this.stats.total.toLocaleString()}`);
    console.log(`✅ Drivers conformes: ${this.stats.valid.toLocaleString()}`);
    console.log(`❌ Drivers non conformes: ${this.stats.invalid.toLocaleString()}`);
    console.log(`🖼️  Icon manquant: ${this.stats.missingIcon.toLocaleString()}`);
    console.log(`🖼️  Images manquantes: ${this.stats.missingImages.toLocaleString()}`);
    console.log(`📁 Assets manquant: ${this.stats.missingAssets.toLocaleString()}`);
    
    const compliancePercentage = this.stats.total > 0 ? 
      Math.round((this.stats.valid / this.stats.total) * 100) : 0;
    
    console.log(`📊 Conformité globale: ${compliancePercentage}%`);
    
    // Statistiques par catégorie
    console.log('\n📁 STATISTIQUES PAR CATÉGORIE:');
    for (const [driverType, stats] of Object.entries(this.stats.categories)) {
      if (stats.total > 0) {
        const categoryCompliance = Math.round((stats.valid / stats.total) * 100);
        console.log(`  ${driverType}: ${stats.valid}/${stats.total} (${categoryCompliance}%)`);
      }
    }
  }

  async generateReport() {
    console.log('\n📋 GÉNÉRATION DU RAPPORT...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.stats.total,
        valid: this.stats.valid,
        invalid: this.stats.invalid,
        compliance: this.stats.total > 0 ? Math.round((this.stats.valid / this.stats.total) * 100) : 0
      },
      details: {
        missingIcon: this.stats.missingIcon,
        missingImages: this.stats.missingImages,
        missingAssets: this.stats.missingAssets
      },
      categories: this.stats.categories,
      recommendations: this.generateRecommendations()
    };
    
    const reportPath = path.join(PROJECT_ROOT, 'ASSETS_VALIDATION_REPORT.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    console.log('✅ Rapport de validation généré: ASSETS_VALIDATION_REPORT.json');
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.missingAssets > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Dossiers assets manquants',
        count: this.stats.missingAssets,
        action: 'Créer le dossier assets/ pour chaque driver manquant'
      });
    }
    
    if (this.stats.missingIcon > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Icônes SVG manquantes',
        count: this.stats.missingIcon,
        action: 'Générer icon.svg pour chaque driver manquant'
      });
    }
    
    if (this.stats.missingImages > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Images PNG manquantes',
        count: this.stats.missingImages,
        action: 'Générer small.png (75x75), large.png (500x500), xlarge.png (1000x1000)'
      });
    }
    
    if (this.stats.valid < this.stats.total * 0.8) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Conformité globale faible',
        count: this.stats.valid,
        action: 'Prioriser la génération d\'assets pour les drivers les plus populaires'
      });
    }
    
    return recommendations;
  }
}

// Exécuter le validateur
const validator = new AssetsValidator();
validator.run().catch(console.error);
