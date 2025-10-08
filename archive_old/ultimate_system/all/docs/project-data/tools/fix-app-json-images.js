#!/usr/bin/env node

/**
 * Fix App.json Images Script
 * Corrige automatiquement les chemins d'images dans app.json
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class AppJsonImageFixer {
  constructor() {
    this.stats = {
      drivers_processed: 0,
      images_fixed: 0,
      errors: 0
    };
  }

  /**
   * Corrige les chemins d'images dans app.json
   */
  async fixAppJsonImages() {
    console.log(chalk.blue('🔧 Correction des chemins d\'images dans app.json...'));
    
    if (!fs.existsSync('app.json')) {
      console.log(chalk.red('❌ app.json non trouvé'));
      return false;
    }

    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      let updated = false;

      // Correction des images principales de l'app
      if (appJson.images) {
        if (appJson.images.small && appJson.images.small === 'small.png') {
          appJson.images.small = 'assets/small.png';
          updated = true;
          this.stats.images_fixed++;
          console.log(chalk.green('✅ Image principale small corrigée'));
        }
        if (appJson.images.large && appJson.images.large === 'large.png') {
          appJson.images.large = 'assets/large.png';
          updated = true;
          this.stats.images_fixed++;
          console.log(chalk.green('✅ Image principale large corrigée'));
        }
      }

      // Correction des images des drivers
      if (appJson.drivers && Array.isArray(appJson.drivers)) {
        console.log(chalk.yellow(`📁 Traitement de ${appJson.drivers.length} drivers...`));
        
        appJson.drivers.forEach((driver, index) => {
          if (driver.images) {
            let driverUpdated = false;
            
            // Correction image small
            if (driver.images.small && driver.images.small === 'small.png') {
              driver.images.small = 'small.png'; // Garder le chemin relatif pour les drivers
              driverUpdated = true;
            }
            
            // Correction image large
            if (driver.images.large && driver.images.large === 'large.png') {
              driver.images.large = 'large.png'; // Garder le chemin relatif pour les drivers
              driverUpdated = true;
            }
            
            if (driverUpdated) {
              this.stats.images_fixed++;
              this.stats.drivers_processed++;
            }
          }
        });
        
        if (this.stats.drivers_processed > 0) {
          updated = true;
          console.log(chalk.green(`✅ ${this.stats.drivers_processed} drivers traités`));
        }
      }

      // Sauvegarder si modifié
      if (updated) {
        fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
        console.log(chalk.green('✅ app.json sauvegardé'));
      } else {
        console.log(chalk.yellow('⚠️  Aucune correction nécessaire'));
      }

      return true;

    } catch (error) {
      console.log(chalk.red(`❌ Erreur correction app.json: ${error.message}`));
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Vérifie que les images des drivers existent
   */
  async verifyDriverImages() {
    console.log(chalk.blue('\n🔍 Vérification des images des drivers...'));
    
    if (!fs.existsSync('app.json')) {
      return false;
    }

    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      let missingImages = 0;

      if (appJson.drivers && Array.isArray(appJson.drivers)) {
        appJson.drivers.forEach((driver, index) => {
          if (driver.images) {
            // Vérifier image small
            if (driver.images.small) {
              const imagePath = path.join('drivers', driver.id || `driver-${index}`, driver.images.small);
              if (!fs.existsSync(imagePath)) {
                missingImages++;
                console.log(chalk.red(`❌ Image manquante: ${imagePath}`));
              }
            }
            
            // Vérifier image large
            if (driver.images.large) {
              const imagePath = path.join('drivers', driver.id || `driver-${index}`, driver.images.large);
              if (!fs.existsSync(imagePath)) {
                missingImages++;
                console.log(chalk.red(`❌ Image manquante: ${imagePath}`));
              }
            }
          }
        });
      }

      if (missingImages === 0) {
        console.log(chalk.green('✅ Toutes les images des drivers sont présentes'));
      } else {
        console.log(chalk.red(`❌ ${missingImages} image(s) manquante(s)`));
      }

      return missingImages === 0;

    } catch (error) {
      console.log(chalk.red(`❌ Erreur vérification images: ${error.message}`));
      return false;
    }
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT DE CORRECTION APP.JSON'));
    console.log(chalk.green('=================================='));
    console.log(chalk.blue(`Drivers traités: ${this.stats.drivers_processed}`));
    console.log(chalk.green(`Images corrigées: ${this.stats.images_fixed}`));
    console.log(chalk.red(`Erreurs: ${this.stats.errors}`));
  }

  /**
   * Exécute la correction complète
   */
  async run() {
    console.log(chalk.blue('🚀 Démarrage de la correction des images app.json...'));
    
    // Correction des chemins
    const fixSuccess = await this.fixAppJsonImages();
    
    // Vérification des images
    const verifySuccess = await this.verifyDriverImages();
    
    // Affichage des statistiques
    this.displayStats();
    
    if (fixSuccess && verifySuccess) {
      console.log(chalk.green('\n🎉 Correction des images app.json terminée avec succès !'));
      return true;
    } else {
      console.log(chalk.yellow('\n⚠️  Correction terminée avec des avertissements'));
      return false;
    }
  }
}

// Exécution principale
async function main() {
  try {
    const fixer = new AppJsonImageFixer();
    const success = await fixer.run();
    
    if (success) {
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

module.exports = AppJsonImageFixer;
