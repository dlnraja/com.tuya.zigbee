#!/usr/bin/env node
'use strict';

/**
 * 🧠 Module d'Enrichissement Heuristique - Version 3.5.0
 * Enrichissement automatique basé sur des règles heuristiques
 */

const fs = require('fs');
const path = require('path');

class HeuristicEnricher {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'enriched',
      rules: {
        maxNameLength: 50,
        requiredTranslations: ['en', 'fr'],
        commonCapabilities: ['onoff', 'measure_power', 'measure_temperature']
      }
    };
    
    this.stats = {
      driversProcessed: 0,
      driversEnriched: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🧠 Enrichissement heuristique...');
    
    try {
      await this.ensureOutputDirectory();
      await this.loadDriverData();
      await this.applyHeuristicRules();
      await this.generateEnrichmentReport();
      
      console.log('✅ Enrichissement heuristique terminé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'enrichissement:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async loadDriverData() {
    console.log('  📊 Chargement des données des drivers...');
    
    const matrixPath = path.join('matrices', 'driver_matrix.json');
    if (fs.existsSync(matrixPath)) {
      this.driverMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
      console.log(`    📁 ${this.driverMatrix.drivers?.length || 0} drivers chargés`);
    } else {
      throw new Error('Matrice des drivers non trouvée');
    }
  }

  async applyHeuristicRules() {
    console.log('  🧠 Application des règles heuristiques...');
    
    if (!this.driverMatrix?.drivers) return;
    
    for (const driver of this.driverMatrix.drivers) {
      await this.enrichDriver(driver);
      this.stats.driversProcessed++;
    }
    
    console.log(`    ✅ ${this.stats.driversEnriched} drivers enrichis`);
  }

  async enrichDriver(driver) {
    try {
      const driverPath = path.join(process.cwd(), driver.path);
      const composePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(composePath)) return;
      
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      let enriched = false;
      
      // Règle 1: Vérification des traductions
      if (this.shouldEnrichTranslations(compose)) {
        compose.name = this.enrichTranslations(compose.name, driver.id);
        enriched = true;
      }
      
      // Règle 2: Vérification des capacités
      if (this.shouldEnrichCapabilities(compose)) {
        compose.capabilities = this.enrichCapabilities(compose.capabilities, compose.class);
        enriched = true;
      }
      
      // Règle 3: Vérification des métadonnées Zigbee
      if (this.shouldEnrichZigbee(compose)) {
        compose.zigbee = this.enrichZigbee(compose.zigbee, driver.id);
        enriched = true;
      }
      
      // Sauvegarde si enrichi
      if (enriched) {
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        this.stats.driversEnriched++;
      }
      
    } catch (error) {
      console.warn(`    ⚠️ Erreur lors de l'enrichissement de ${driver.id}:`, error.message);
      this.stats.errors++;
    }
  }

  shouldEnrichTranslations(compose) {
    if (!compose.name || typeof compose.name !== 'object') return true;
    
    for (const lang of this.config.rules.requiredTranslations) {
      if (!compose.name[lang] || compose.name[lang].length > this.config.rules.maxNameLength) {
        return true;
      }
    }
    
    return false;
  }

  enrichTranslations(name, driverId) {
    const enriched = name || {};
    
    if (!enriched.en) {
      enriched.en = this.generateEnglishName(driverId);
    }
    
    if (!enriched.fr) {
      enriched.fr = this.generateFrenchName(driverId);
    }
    
    return enriched;
  }

  generateEnglishName(driverId) {
    // Conversion basique de l'ID en nom anglais
    return driverId
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  generateFrenchName(driverId) {
    // Conversion basique de l'ID en nom français
    const englishName = this.generateEnglishName(driverId);
    
    // Traductions simples
    const translations = {
      'light': 'lampe',
      'switch': 'interrupteur',
      'sensor': 'capteur',
      'plug': 'prise',
      'motion': 'mouvement',
      'temperature': 'température',
      'humidity': 'humidité'
    };
    
    let frenchName = englishName;
    for (const [en, fr] of Object.entries(translations)) {
      frenchName = frenchName.replace(new RegExp(en, 'gi'), fr);
    }
    
    return frenchName;
  }

  shouldEnrichCapabilities(compose) {
    return !compose.capabilities || compose.capabilities.length === 0;
  }

  enrichCapabilities(capabilities, deviceClass) {
    const enriched = capabilities || [];
    
    // Ajout de capacités basées sur la classe
    const classCapabilities = {
      'light': ['onoff', 'dim'],
      'switch': ['onoff'],
      'socket': ['onoff', 'measure_power'],
      'sensor': ['measure_temperature'],
      'cover': ['windowcoverings_state', 'windowcoverings_set']
    };
    
    if (deviceClass && classCapabilities[deviceClass]) {
      for (const cap of classCapabilities[deviceClass]) {
        if (!enriched.includes(cap)) {
          enriched.push(cap);
        }
      }
    }
    
    return enriched;
  }

  shouldEnrichZigbee(compose) {
    return !compose.zigbee || Object.keys(compose.zigbee).length === 0;
  }

  enrichZigbee(zigbee, driverId) {
    const enriched = zigbee || {};
    
    // Ajout d'identifiants Zigbee basés sur l'ID du driver
    if (!enriched.manufacturerName) {
      enriched.manufacturerName = ['Tuya'];
    }
    
    if (!enriched.modelId) {
      enriched.modelId = [driverId.toUpperCase()];
    }
    
    return enriched;
  }

  async generateEnrichmentReport() {
    console.log('  📊 Génération du rapport d\'enrichissement...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      stats: this.stats,
      summary: {
        totalDrivers: this.stats.driversProcessed,
        enrichedDrivers: this.stats.driversEnriched,
        enrichmentRate: this.stats.driversProcessed > 0 ? 
          (this.stats.driversEnriched / this.stats.driversProcessed * 100).toFixed(2) : 0,
        errors: this.stats.errors
      }
    };
    
    const reportPath = path.join(this.config.outputDir, 'enrichment_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport d'enrichissement: ${reportPath}`);
  }
}

// Point d'entrée
if (require.main === module) {
  const enricher = new HeuristicEnricher();
  enricher.run().catch(console.error);
}

module.exports = HeuristicEnricher;
