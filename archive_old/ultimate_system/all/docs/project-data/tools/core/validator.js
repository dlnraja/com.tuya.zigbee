#!/usr/bin/env node
'use strict';

/**
 * ✅ Module de Validation - Version 3.5.0
 * Validation complète de la structure et des drivers du projet
 */

const fs = require('fs');
const path = require('path');

class ProjectValidator {
  constructor() {
    this.config = {
      version: '3.5.0',
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
      errors: []
    };
  }

  async run() {
    console.log('✅ Validation du projet...');
    
    try {
      await this.validateProjectStructure();
      await this.validateDrivers();
      await this.generateValidationReport();
      
      console.log('✅ Validation terminée avec succès');
      console.log(`📊 Résumé: ${this.stats.validDrivers}/${this.stats.totalDrivers} drivers valides`);
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error.message);
      throw error;
    }
  }

  /**
   * 🏗️ Validation de la structure du projet
   */
  async validateProjectStructure() {
    console.log('  🏗️ Validation de la structure...');
    
    const requiredDirs = ['drivers', 'lib', 'tools', 'docs'];
    const requiredFiles = ['app.json', 'package.json', 'README.md'];
    
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Répertoire requis manquant: ${dir}`);
      }
      console.log(`    ✅ Répertoire: ${dir}`);
    }
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Fichier requis manquant: ${file}`);
      }
      console.log(`    ✅ Fichier: ${file}`);
    }
  }

  /**
   * 🔍 Validation des drivers
   */
  async validateDrivers() {
    console.log('  🔍 Validation des drivers...');
    
    const driversDir = path.join(process.cwd(), 'drivers');
    const driverPaths = this.findDriverPaths(driversDir);
    
    this.stats.totalDrivers = driverPaths.length;
    console.log(`    📁 ${driverPaths.length} drivers trouvés`);
    
    for (const driverPath of driverPaths) {
      await this.validateDriver(driverPath);
    }
  }

  /**
   * 📁 Recherche des chemins des drivers
   */
  findDriverPaths(dir) {
    const driverPaths = [];
    
    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Vérifier si c'est un driver
          if (fs.existsSync(path.join(fullPath, 'driver.compose.json'))) {
            driverPaths.push(fullPath);
          }
          // Continuer à scanner récursivement
          walkDir(fullPath);
        }
      }
    };
    
    walkDir(dir);
    return driverPaths;
  }

  /**
   * ✅ Validation d'un driver individuel
   */
  async validateDriver(driverPath) {
    const driverId = path.basename(driverPath);
    const relativePath = path.relative(process.cwd(), driverPath);
    
    try {
      const validation = {
        id: driverId,
        path: relativePath,
        valid: true,
        errors: [],
        warnings: [],
        files: {}
      };

      // Validation des fichiers requis
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
        const composeValidation = await this.validateComposeFile(path.join(driverPath, 'driver.compose.json'));
        if (!composeValidation.valid) {
          validation.errors.push(...composeValidation.errors);
          validation.valid = false;
        }
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
      console.warn(`    ⚠️ Erreur lors de la validation du driver ${driverId}:`, error.message);
      this.stats.invalidDrivers++;
    }
  }

  /**
   * 📄 Validation d'un fichier compose
   */
  async validateComposeFile(composePath) {
    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const compose = JSON.parse(content);
      
      const validation = {
        valid: true,
        errors: []
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

      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [`Erreur de parsing JSON: ${error.message}`]
      };
    }
  }

  /**
   * 📊 Génération du rapport de validation
   */
  async generateValidationReport() {
    console.log('  📊 Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      summary: {
        totalDrivers: this.stats.totalDrivers,
        validDrivers: this.stats.validDrivers,
        invalidDrivers: this.stats.invalidDrivers,
        warnings: this.stats.warnings,
        successRate: this.stats.totalDrivers > 0 ? 
          (this.stats.validDrivers / this.stats.totalDrivers * 100).toFixed(2) : 0
      },
      errors: this.stats.errors,
      recommendations: this.generateRecommendations()
    };

    const reportPath = `VALIDATION_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`    📄 Rapport sauvegardé: ${reportPath}`);
  }

  /**
   * 💡 Génération des recommandations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.invalidDrivers > 0) {
      recommendations.push('Corriger les drivers invalides identifiés');
    }
    
    if (this.stats.warnings > 0) {
      recommendations.push('Traiter les avertissements pour améliorer la qualité');
    }
    
    if (this.stats.validDrivers < this.stats.totalDrivers * 0.9) {
      recommendations.push('Améliorer le taux de validation des drivers');
    }
    
    return recommendations;
  }
}

// Point d'entrée
if (require.main === module) {
  const validator = new ProjectValidator();
  validator.run().catch(console.error);
}

module.exports = ProjectValidator;
