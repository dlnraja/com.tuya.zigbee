#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * Homey Validation Script
 * Validation alternative sans CLI Homey
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class HomeyValidator {
  constructor() {
    this.stats = {
      drivers_validated: 0,
      errors_found: 0,
      warnings: 0,
      images_valid: 0,
      images_missing: 0
    };
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Valide un driver individuel
   */
  validateDriver(driverPath, driverName) {
    try {
      const driverComposePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(driverComposePath)) {
        this.addError(`Driver ${driverName}: driver.compose.json manquant`);
        return false;
      }

      const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
      let driverValid = true;

      // Validation de la classe
      if (!driverData.class) {
        this.addError(`Driver ${driverName}: classe manquante`);
        driverValid = false;
      } else {
        const validClasses = [
          'light', 'switch', 'sensor', 'thermostat', 'cover', 'climate',
          'button', 'remote', 'lock', 'alarm', 'fan', 'heater', 'curtain'
        ];
        
        if (!validClasses.includes(driverData.class)) {
          this.addWarning(`Driver ${driverName}: classe "${driverData.class}" non standard`);
        }
      }

      // Validation des images
      if (driverData.images) {
        if (driverData.images.small) {
          const smallImagePath = path.join(driverPath, driverData.images.small);
          if (fs.existsSync(smallImagePath)) {
            this.stats.images_valid++;
          } else {
            this.addError(`Driver ${driverName}: image small manquante: ${driverData.images.small}`);
            this.stats.images_missing++;
            driverValid = false;
          }
        }

        if (driverData.images.large) {
          const largeImagePath = path.join(driverPath, driverData.images.large);
          if (fs.existsSync(largeImagePath)) {
            this.stats.images_valid++;
          } else {
            this.addError(`Driver ${driverName}: image large manquante: ${driverData.images.large}`);
            this.stats.images_missing++;
            driverValid = false;
          }
        }
      } else {
        this.addWarning(`Driver ${driverName}: section images manquante`);
      }

      // Validation des capacités
      if (driverData.capabilities) {
        if (!Array.isArray(driverData.capabilities)) {
          this.addError(`Driver ${driverName}: capabilities doit être un tableau`);
          driverValid = false;
        }
      }

      // Validation Zigbee
      if (driverData.zigbee) {
        if (driverData.zigbee.clusters) {
          if (!Array.isArray(driverData.zigbee.clusters)) {
            this.addWarning(`Driver ${driverName}: clusters Zigbee doit être un tableau`);
          }
        }
      }

      if (driverValid) {
        this.stats.drivers_validated++;
      }

      return driverValid;

    } catch (error) {
      this.addError(`Driver ${driverName}: erreur de parsing: ${error.message}`);
      return false;
    }
  }

  /**
   * Valide tous les drivers
   */
  validateAllDrivers() {
    console.log(chalk.blue('🔍 Validation de tous les drivers...'));
    
    const driversDir = path.join(process.cwd(), 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      this.addError('Dossier drivers non trouvé');
      return false;
    }

    const driverDirs = fs.readdirSync(driversDir)
      .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

    console.log(chalk.yellow(`📁 ${driverDirs.length} drivers trouvés`));

    for (const driverDir of driverDirs) {
      const driverPath = path.join(driversDir, driverDir);
      this.validateDriver(driverPath, driverDir);
    }

    return true;
  }

  /**
   * Valide la structure principale de l'app
   */
  validateAppStructure() {
    console.log(chalk.blue('🏠 Validation de la structure de l\'app...'));
    
    const requiredFiles = [
      'app.json',
      'package.json',
      '.homeycompose/compose.json'
    ];

    const requiredAssets = [
      'assets/small.png',
      'assets/large.png',
      'assets/icon.png'
    ];

    // Validation des fichiers requis
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.addError(`Fichier requis manquant: ${file}`);
      }
    });

    // Validation des assets
    requiredAssets.forEach(asset => {
      if (!fs.existsSync(asset)) {
        this.addError(`Asset requis manquant: ${asset}`);
        this.stats.images_missing++;
      } else {
        this.stats.images_valid++;
      }
    });

    return true;
  }

  /**
   * Ajoute une erreur
   */
  addError(message) {
    this.errors.push(message);
    this.stats.errors_found++;
  }

  /**
   * Ajoute un avertissement
   */
  addWarning(message) {
    this.warnings.push(message);
    this.stats.warnings++;
  }

  /**
   * Affiche le rapport complet
   */
  displayReport() {
    console.log(chalk.green('\n📊 RAPPORT DE VALIDATION HOMEY'));
    console.log(chalk.green('================================'));
    console.log(chalk.blue(`Drivers validés: ${this.stats.drivers_validated}`));
    console.log(chalk.green(`Images valides: ${this.stats.images_valid}`));
    console.log(chalk.red(`Images manquantes: ${this.stats.images_missing}`));
    console.log(chalk.red(`Erreurs: ${this.stats.errors_found}`));
    console.log(chalk.yellow(`Avertissements: ${this.stats.warnings}`));

    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ ERREURS TROUVÉES:'));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }

    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  AVERTISSEMENTS:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    if (this.stats.errors_found === 0) {
      console.log(chalk.green('\n🎉 Validation réussie ! Aucune erreur critique trouvée.'));
    } else {
      console.log(chalk.red(`\n💥 Validation échouée avec ${this.stats.errors_found} erreur(s).`));
    }
  }
}

// Exécution principale
async function main() {
  try {
    const validator = new HomeyValidator();
    
    // Validation de la structure de l'app
    validator.validateAppStructure();
    
    // Validation de tous les drivers
    validator.validateAllDrivers();
    
    // Affichage du rapport
    validator.displayReport();
    
    if (validator.stats.errors_found === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red(`\n💥 Erreur fatale: ${error.message}`));
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

module.exports = HomeyValidator;
