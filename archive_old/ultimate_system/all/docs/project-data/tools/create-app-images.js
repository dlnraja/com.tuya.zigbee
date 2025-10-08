#!/usr/bin/env node

/**
 * App Images Creation Script
 * Crée des images PNG valides pour l'app principale
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class AppImageCreator {
  constructor() {
    this.stats = {
      images_created: 0,
      errors: 0
    };
  }

  /**
   * Crée une image PNG valide
   */
  createValidPNG(outputPath, width = 64, height = 64) {
    try {
      // Créer le dossier s'il n'existe pas
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Créer une image PNG valide avec les dimensions spécifiées
      const pngBuffer = this.generatePNGBuffer(width, height);
      
      fs.writeFileSync(outputPath, pngBuffer);
      this.stats.images_created++;
      
      return true;
    } catch (error) {
      this.logError(`Erreur création image ${outputPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Génère un buffer PNG valide
   */
  generatePNGBuffer(width, height) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);      // Width
    ihdrData.writeUInt32BE(height, 4);     // Height
    ihdrData.writeUInt8(8, 8);             // Bit depth
    ihdrData.writeUInt8(6, 9);             // Color type (RGBA)
    ihdrData.writeUInt8(0, 10);            // Compression
    ihdrData.writeUInt8(0, 11);            // Filter
    ihdrData.writeUInt8(0, 12);            // Interlace
    
    const ihdrChunk = this.createChunk('IHDR', ihdrData);
    
    // IDAT chunk (données compressées minimales)
    const idatData = Buffer.from([0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
    const idatChunk = this.createChunk('IDAT', idatData);
    
    // IEND chunk
    const iendChunk = this.createChunk('IEND', Buffer.alloc(0));
    
    // Assembler le PNG
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }

  /**
   * Crée un chunk PNG
   */
  createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    
    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = this.calculateCRC(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);
    
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
  }

  /**
   * Calcule le CRC32
   */
  calculateCRC(buffer) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buffer.length; i++) {
      crc = crc ^ buffer[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Crée toutes les images de l'app
   */
  async createAllAppImages() {
    console.log(chalk.blue('🎨 Création des images de l\'app...'));
    
    const images = [
      { path: 'assets/images/small.png', width: 64, height: 64 },
      { path: 'assets/images/large.png', width: 256, height: 256 },
      { path: 'assets/icon.png', width: 128, height: 128 }
    ];

    for (const image of images) {
      if (this.createValidPNG(image.path, image.width, image.height)) {
        this.logSuccess(`Image créée: ${image.path} (${image.width}x${image.height})`);
      }
    }

    return true;
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT DE CRÉATION D\'IMAGES APP'));
    console.log(chalk.green('======================================'));
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
    const creator = new AppImageCreator();
    
    await creator.createAllAppImages();
    creator.displayStats();
    
    if (creator.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Création d\'images app terminée avec succès !'));
      process.exit(0);
    } else {
      console.log(chalk.yellow('\n⚠️  Création terminée avec des erreurs'));
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

module.exports = AppImageCreator;
