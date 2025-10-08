#!/usr/bin/env node
'use strict';

/**
 * ✅ Module de Validation Finale - Version 3.5.0
 * Validation complète et finale du projet après enrichissement
 */

const fs = require('fs');
const path = require('path');

class FinalValidator {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'final-validation',
      validationRules: {
        requiredFiles: ['driver.compose.json', 'device.js'],
        optionalFiles: ['driver.js', 'pair.js', 'assets/icon.svg', 'settings.json'],
        maxFileSize: 1024 * 1024, // 1MB
        supportedClasses: [
          'light', 'switch', 'socket', 'sensor', 'cover', 'thermostat',
          'curtain', 'lock', 'button', 'remote', 'fan', 'climate'
        ]
      }
    };
    
    this.stats = {
      totalDrivers: 0,
      validDrivers: 0,
      invalidDrivers: 0,
      warnings: 0,
      errors: [],
      enrichedDrivers: 0
    };
  }

  async run() {
    console.log('✅ Validation finale du projet...');
    
    try {
      await this.ensureOutputDirectory();
      await this.loadAllData();
      await this.performFinalValidation();
      await this.validateEnrichment();
      await this.generateFinalReport();
      
      console.log('✅ Validation finale terminée avec succès');
      console.log(`📊 Résumé: ${this.stats.validDrivers}/${this.stats.totalDrivers} drivers valides`);
    } catch (error) {
      console.error('❌ Erreur lors de la validation finale:', error.message);
      throw error;
    }
  }

  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async loadAllData() {
    console.log('  📊 Chargement de toutes les données...');
    
    // Chargement de la matrice des drivers
    const matrixPath = path.join('matrices', 'driver_matrix.json');
    if (fs.existsSync(matrixPath)) {
      this.driverMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
      this.stats.totalDrivers = this.driverMatrix.drivers?.length || 0;
    }
    
    // Chargement des rapports d'enrichissement
    this.enrichmentReports = {};
    const enrichedDir = 'enriched';
    if (fs.existsSync(enrichedDir)) {
      const enrichedFiles = fs.readdirSync(enrichedDir).filter(f => f.endsWith('.json'));
      for (const file of enrichedFiles) {
        const reportPath = path.join(enrichedDir, file);
        this.enrichmentReports[file] = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      }
    }
    
    console.log(`    📁 ${this.stats.totalDrivers} drivers chargés`);
    console.log(`    📊 ${Object.keys(this.enrichmentReports).length} rapports d'enrichissement chargés`);
  }

  async performFinalValidation() {
    console.log('  ✅ Validation finale des drivers...');
    
    if (!this.driverMatrix?.drivers) return;
    
    for (const driver of this.driverMatrix.drivers) {
      await this.validateDriverFinal(driver);
    }
  }

  async validateDriverFinal(driver) {
    const driverPath = path.join(process.cwd(), driver.path);
    
    try {
      const validation = {
        id: driver.id,
        path: driver.path,
        valid: true,
        errors: [],
        warnings: [],
        files: {},
        enrichment: {}
      };

      // Validation des fichiers
      for (const requiredFile of this.config.validationRules.requiredFiles) {
        const filePath = path.join(driverPath, requiredFile);
        if (fs.existsSync(filePath)) {
          validation.files[requiredFile] = { exists: true, valid: true };
        } else {
          validation.files[requiredFile] = { exists: false, valid: false };
          validation.errors.push(`Fichier requis manquant: ${requiredFile}`);
          validation.valid = false;
        }
      }

      // Validation des fichiers optionnels
      for (const optionalFile of this.config.validationRules.optionalFiles) {
        const filePath = path.join(driverPath, optionalFile);
        if (fs.existsSync(filePath)) {
          validation.files[optionalFile] = { exists: true, valid: true };
        } else {
          validation.files[optionalFile] = { exists: false, valid: false };
          validation.warnings.push(`Fichier optionnel manquant: ${optionalFile}`);
        }
      }

      // Validation du fichier compose
      if (validation.files['driver.compose.json']?.exists) {
        const composeValidation = await this.validateComposeFileFinal(path.join(driverPath, 'driver.compose.json'));
        if (!composeValidation.valid) {
          validation.errors.push(...composeValidation.errors);
          validation.valid = false;
        }
        validation.enrichment = composeValidation.enrichment || {};
      }

      // Mise à jour des statistiques
      if (validation.valid) {
        this.stats.validDrivers++;
      } else {
        this.stats.invalidDrivers++;
        this.stats.errors.push(validation);
      }

      this.stats.warnings += validation.warnings.length;

    } catch (error) {
      console.warn(`    ⚠️ Erreur lors de la validation finale de ${driver.id}:`, error.message);
      this.stats.invalidDrivers++;
    }
  }

  async validateComposeFileFinal(composePath) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const compose = JSON.parse(content);
      
      const validation = {
        valid: true,
        errors: [],
        enrichment: {}
      };

      // Validation des champs requis
      if (!compose.id) {
        validation.errors.push('Champ "id" manquant');
        validation.valid = false;
      }

      if (!compose.name) {
        validation.errors.push('Champ "name" manquant');
        validation.valid = false;
      }

      if (!compose.class) {
        validation.errors.push('Champ "class" manquant');
        validation.valid = false;
      } else if (!this.config.validationRules.supportedClasses.includes(compose.class)) {
        validation.warnings.push(`Classe non supportée: ${compose.class}`);
      }

      if (!compose.capabilities || !Array.isArray(compose.capabilities)) {
        validation.errors.push('Champ "capabilities" manquant ou invalide');
        validation.valid = false;
      }

      // Validation des traductions
      if (compose.name && typeof compose.name === 'object') {
        if (!compose.name.en && !compose.name.fr) {
          validation.warnings.push('Traductions manquantes (en/fr)');
        }
      }

      // Vérification de l'enrichissement
      if (compose.homeyForum || compose.zigbee2mqtt) {
        validation.enrichment = {
          homeyForum: compose.homeyForum ? true : false,
          zigbee2mqtt: compose.zigbee2mqtt ? true : false
        };
      }

      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur de parsing JSON: ${error.message}`]
      };
    }
  }

  async validateEnrichment() {
    console.log('  🧠 Validation de l\'enrichissement...');
    
    let totalEnriched = 0;
    
    if (this.driverMatrix?.drivers) {
      for (const driver of this.driverMatrix.drivers) {
        const driverPath = path.join(process.cwd(), driver.path);
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(composePath)) {
          try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            if (compose.homeyForum || compose.zigbee2mqtt) {
              totalEnriched++;
            }
          } catch (error) {
            // Ignorer les erreurs de parsing
          }
        }
      }
    }
    
    this.stats.enrichedDrivers = totalEnriched;
    console.log(`    ✅ ${totalEnriched} drivers enrichis validés`);
  }

  async generateFinalReport() {
    console.log('  📊 Génération du rapport final...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      summary: {
        totalDrivers: this.stats.totalDrivers,
        validDrivers: this.stats.validDrivers,
        invalidDrivers: this.stats.invalidDrivers,
        enrichedDrivers: this.stats.enrichedDrivers,
        warnings: this.stats.warnings,
        successRate: this.stats.totalDrivers > 0 ? 
          (this.stats.validDrivers / this.stats.totalDrivers * 100).toFixed(2) : 0,
        enrichmentRate: this.stats.totalDrivers > 0 ? 
          (this.stats.enrichedDrivers / this.stats.totalDrivers * 100).toFixed(2) : 0
      },
      errors: this.stats.errors,
      enrichmentReports: this.enrichmentReports,
      recommendations: this.generateFinalRecommendations()
    };

    const reportPath = path.join(this.config.outputDir, 'final_validation_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport final: ${reportPath}`);
  }

  generateFinalRecommendations() {
    const recommendations = [];
    
    if (this.stats.invalidDrivers > 0) {
      recommendations.push(`Corriger ${this.stats.invalidDrivers} drivers invalides`);
    }
    
    if (this.stats.warnings > 0) {
      recommendations.push(`Traiter ${this.stats.warnings} avertissements`);
    }
    
    if (this.stats.validDrivers < this.stats.totalDrivers * 0.95) {
      recommendations.push('Améliorer le taux de validation des drivers (>95%)');
    }
    
    if (this.stats.enrichedDrivers < this.stats.totalDrivers * 0.8) {
      recommendations.push('Augmenter le taux d\'enrichissement des drivers (>80%)');
    }
    
    return recommendations;
  }
}

// Point d'entrée
if (require.main === module) {
  const validator = new FinalValidator();
  validator.run().catch(console.error);
}

module.exports = FinalValidator;
