#!/usr/bin/env node

/**
 * Image Conversion Script
 * Convertit toutes les images SVG en PNG et crée des images par défaut
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ImageConverter {
  constructor() {
    this.stats = {
      drivers_processed: 0,
      images_created: 0,
      errors: 0
    };
  }

  /**
   * Crée une image PNG par défaut
   */
  createDefaultPNG(outputPath, size = 'small') {
    try {
      // Créer le dossier assets s'il n'existe pas
      const assetsDir = path.dirname(outputPath);
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Créer une image PNG simple (1x1 pixel transparent)
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR chunk type
        0x00, 0x00, 0x00, 0x01, // Width: 1 pixel
        0x00, 0x00, 0x00, 0x01, // Height: 1 pixel
        0x08, // Bit depth: 8
        0x06, // Color type: RGBA
        0x00, // Compression method
        0x00, // Filter method
        0x00, // Interlace method
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
        0x49, 0x44, 0x41, 0x54, // IDAT chunk type
        0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // Compressed data
        0xE5, 0x90, 0x3B, 0x6E, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND chunk type
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);

      fs.writeFileSync(outputPath, pngBuffer);
      this.stats.images_created++;
      
      return true;
    } catch (error) {
      this.logError(`Erreur création image ${outputPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Traite un driver pour ses images
   */
  processDriver(driverPath) {
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
            const imagePath = driverData.images[type];
            
            // Si c'est un SVG, convertir en PNG
            if (imagePath.endsWith('.svg')) {
              const newImagePath = imagePath.replace('.svg', '.png');
              const fullImagePath = path.join(driverPath, newImagePath);
              
              // Créer l'image PNG
              if (this.createDefaultPNG(fullImagePath, type)) {
                driverData.images[type] = newImagePath;
                updated = true;
                this.logSuccess(`Image ${type} convertie: ${driverPath}`);
              }
            }
            // Si c'est un PNG, vérifier qu'il existe
            else if (imagePath.endsWith('.png')) {
              const fullImagePath = path.join(driverPath, imagePath);
              if (!fs.existsSync(fullImagePath)) {
                // Créer l'image PNG manquante
                if (this.createDefaultPNG(fullImagePath, type)) {
                  updated = true;
                  this.logSuccess(`Image ${type} créée: ${driverPath}`);
                }
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
      this.logError(`Erreur traitement driver ${driverPath}: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Traite tous les drivers
   */
  async processAllDrivers() {
    console.log(chalk.blue('🎨 Démarrage de la conversion d\'images...'));
    
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
      this.processDriver(driverPath);
    }

    return true;
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT DE CONVERSION D\'IMAGES'));
    console.log(chalk.green('===================================='));
    console.log(chalk.blue(`Drivers traités: ${this.stats.drivers_processed}`));
    console.log(chalk.green(`Images créées: ${this.stats.images_created}`));
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
    const converter = new ImageConverter();
    
    await converter.processAllDrivers();
    converter.displayStats();
    
    if (converter.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Conversion d\'images terminée avec succès !'));
      process.exit(0);
    } else {
      console.log(chalk.yellow('\n⚠️  Conversion terminée avec des erreurs'));
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

module.exports = ImageConverter;
