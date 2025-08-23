#!/usr/bin/env node

/**
 * Fix Image Placement Script
 * Corrige automatiquement le placement des images dans tous les drivers
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ImagePlacementFixer {
  constructor() {
    this.stats = {
      drivers_processed: 0,
      images_fixed: 0,
      errors: 0
    };
  }

  /**
   * Corrige le placement des images dans un driver
   */
  fixDriverImages(driverPath) {
    try {
      const driverComposePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(driverComposePath)) {
        return false;
      }

      const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
      let updated = false;

      // Traitement des images
      if (driverData.images) {
        const imageTypes = ['small', 'large'];
        
        imageTypes.forEach(type => {
          if (driverData.images[type]) {
            const currentImagePath = driverData.images[type];
            const currentFullPath = path.join(driverPath, currentImagePath);
            
            // Vérifier si l'image existe
            if (fs.existsSync(currentFullPath)) {
              // Créer une copie à la racine du driver si nécessaire
              const rootImagePath = `${type}.png`;
              const rootFullPath = path.join(driverPath, rootImagePath);
              
              if (!fs.existsSync(rootFullPath)) {
                // Copier l'image à la racine
                fs.copyFileSync(currentFullPath, rootFullPath);
                this.logSuccess(`Image ${type} copiée à la racine: ${driverPath}`);
                this.stats.images_fixed++;
              }
              
              // Mettre à jour le chemin dans le driver.compose.json
              if (driverData.images[type] !== rootImagePath) {
                driverData.images[type] = rootImagePath;
                updated = true;
                this.logSuccess(`Chemin image ${type} corrigé: ${driverPath}`);
              }
            }
          }
        });
      }

      // Sauvegarder si modifié
      if (updated) {
        fs.writeFileSync(driverComposePath, JSON.stringify(driverData, null, 2));
      }

      this.stats.drivers_processed++;
      return true;

    } catch (error) {
      this.logError(`Erreur correction driver ${driverPath}: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Corrige tous les drivers
   */
  async fixAllDrivers() {
    console.log(chalk.blue('🔧 Démarrage de la correction du placement d\'images...'));
    
    const driversDir = path.join(process.cwd(), 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      this.logError('Dossier drivers non trouvé');
      return false;
    }

    const driverDirs = fs.readdirSync(driversDir)
      .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

    console.log(chalk.yellow(`📁 ${driverDirs.length} drivers trouvés`));

    for (const driverDir of driverDirs) {
      const driverPath = path.join(driversDir, driverDir);
      this.fixDriverImages(driverPath);
    }

    return true;
  }

  /**
   * Corrige les images principales de l'app
   */
  async fixAppImages() {
    console.log(chalk.blue('🏠 Correction des images principales de l\'app...'));
    
    const images = [
      { source: 'assets/images/small.png', target: 'assets/small.png' },
      { source: 'assets/images/large.png', target: 'assets/large.png' }
    ];

    for (const image of images) {
      if (fs.existsSync(image.source) && !fs.existsSync(image.target)) {
        fs.copyFileSync(image.source, image.target);
        this.logSuccess(`Image app copiée: ${image.target}`);
        this.stats.images_fixed++;
      }
    }

    return true;
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT DE CORRECTION PLACEMENT IMAGES'));
    console.log(chalk.green('============================================'));
    console.log(chalk.blue(`Drivers traités: ${this.stats.drivers_processed}`));
    console.log(chalk.green(`Images corrigées: ${this.stats.images_fixed}`));
    console.log(chalk.red(`Erreurs: ${this.stats.errors}`));
  }

  // Méthodes de logging
  logSuccess(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  logError(message) {
    console.log(chalk.red(`❌ ${message}`));
  }
}

// Exécution principale
async function main() {
  try {
    const fixer = new ImagePlacementFixer();
    
    // Corriger les images principales de l'app
    await fixer.fixAppImages();
    
    // Corriger tous les drivers
    await fixer.fixAllDrivers();
    
    fixer.displayStats();
    
    if (fixer.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Correction du placement d\'images terminée avec succès !'));
      process.exit(0);
    } else {
      console.log(chalk.yellow('\n⚠️  Correction terminée avec des erreurs'));
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

module.exports = ImagePlacementFixer;
