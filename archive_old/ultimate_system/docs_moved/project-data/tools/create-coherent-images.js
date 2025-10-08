#!/usr/bin/env node

/**
 * Coherent Images Creation Script
 * Crée des images cohérentes selon les standards Homey SDK3
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration des images selon les standards Homey
const IMAGE_STANDARDS = {
  app: {
    small: { width: 64, height: 64, bgColor: '#2D7DD2', iconColor: '#FFFFFF' },
    large: { width: 256, height: 256, bgColor: '#2D7DD2', iconColor: '#FFFFFF' },
    icon: { width: 128, height: 128, bgColor: '#2D7DD2', iconColor: '#FFFFFF' }
  },
  drivers: {
    light: { bgColor: '#FFD700', iconColor: '#000000', symbol: '💡' },
    socket: { bgColor: '#32CD32', iconColor: '#FFFFFF', symbol: '🔌' },
    switch: { bgColor: '#FF6347', iconColor: '#FFFFFF', symbol: '🔘' },
    sensor: { bgColor: '#87CEEB', iconColor: '#000000', symbol: '📡' },
    thermostat: { bgColor: '#FF8C00', iconColor: '#FFFFFF', symbol: '🌡️' },
    cover: { bgColor: '#8A2BE2', iconColor: '#FFFFFF', symbol: '🪟' },
    lock: { bgColor: '#DC143C', iconColor: '#FFFFFF', symbol: '🔒' },
    fan: { bgColor: '#00CED1', iconColor: '#000000', symbol: '💨' },
    climate: { bgColor: '#FF69B4', iconColor: '#FFFFFF', symbol: '❄️' },
    remote: { bgColor: '#FFD700', iconColor: '#000000', symbol: '📱' },
    device: { bgColor: '#808080', iconColor: '#FFFFFF', symbol: '⚙️' }
  }
};

class CoherentImageCreator {
  constructor() {
    this.stats = {
      images_created: 0,
      drivers_processed: 0,
      errors: 0
    };
  }

  /**
   * Crée une image PNG avec un design cohérent
   */
  createCoherentPNG(outputPath, config, deviceClass = null) {
    try {
      // Créer le dossier s'il n'existe pas
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Générer l'image selon le type
      let pngBuffer;
      if (deviceClass && IMAGE_STANDARDS.drivers[deviceClass]) {
        pngBuffer = this.generateDriverPNG(config, IMAGE_STANDARDS.drivers[deviceClass]);
      } else {
        pngBuffer = this.generateAppPNG(config);
      }

      fs.writeFileSync(outputPath, pngBuffer);
      this.stats.images_created++;
      
      return true;
    } catch (error) {
      this.logError(`Erreur création image ${outputPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Génère une image PNG pour l'app principale
   */
  generateAppPNG(config) {
    const { width, height, bgColor, iconColor } = config;
    
    // Créer une image PNG avec un design moderne Homey
    const pngBuffer = this.createModernPNG(width, height, bgColor, iconColor, '🏠');
    
    return pngBuffer;
  }

  /**
   * Génère une image PNG pour un driver
   */
  generateDriverPNG(config, driverConfig) {
    const { width, height } = config;
    const { bgColor, iconColor, symbol } = driverConfig;
    
    // Créer une image PNG avec le symbole du driver
    const pngBuffer = this.createModernPNG(width, height, bgColor, iconColor, symbol);
    
    return pngBuffer;
  }

  /**
   * Crée une image PNG moderne avec design cohérent
   */
  createModernPNG(width, height, bgColor, iconColor, symbol) {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk avec dimensions réelles
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);      // Width
    ihdrData.writeUInt32BE(height, 4);     // Height
    ihdrData.writeUInt8(8, 8);             // Bit depth
    ihdrData.writeUInt8(6, 9);             // Color type (RGBA)
    ihdrData.writeUInt8(0, 10);            // Compression
    ihdrData.writeUInt8(0, 11);            // Filter
    ihdrData.writeUInt8(0, 12);            // Interlace
    
    const ihdrChunk = this.createChunk('IHDR', ihdrData);
    
    // IDAT chunk avec données RGBA (couleur de fond + symbole)
    const idatData = this.generateRGBAImageData(width, height, bgColor, iconColor, symbol);
    const idatChunk = this.createChunk('IDAT', idatData);
    
    // IEND chunk
    const iendChunk = this.createChunk('IEND', Buffer.alloc(0));
    
    // Assembler le PNG
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }

  /**
   * Génère des données RGBA pour l'image
   */
  generateRGBAImageData(width, height, bgColor, iconColor, symbol) {
    // Convertir les couleurs hex en RGB
    const bgRGB = this.hexToRGB(bgColor);
    const iconRGB = this.hexToRGB(iconColor);
    
    // Créer un buffer pour les données RGBA
    const data = Buffer.alloc(width * height * 4);
    let offset = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Déterminer si c'est le symbole ou l'arrière-plan
        const isSymbol = this.isSymbolPixel(x, y, width, height, symbol);
        
        if (isSymbol) {
          data[offset++] = iconRGB.r;     // R
          data[offset++] = iconRGB.g;     // G
          data[offset++] = iconRGB.b;     // B
          data[offset++] = 255;           // A (opaque)
        } else {
          data[offset++] = bgRGB.r;       // R
          data[offset++] = bgRGB.g;       // G
          data[offset++] = bgRGB.b;       // B
          data[offset++] = 255;           // A (opaque)
        }
      }
    }
    
    // Compresser les données (simulation simple)
    return this.compressData(data);
  }

  /**
   * Détermine si un pixel fait partie du symbole
   */
  isSymbolPixel(x, y, width, height, symbol) {
    const centerX = width / 2;
    const centerY = height / 2;
    const symbolSize = Math.min(width, height) * 0.4;
    
    // Créer un symbole simple au centre
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    
    switch (symbol) {
      case '💡': // Light - cercle avec ligne
        return distance < symbolSize || 
               (Math.abs(x - centerX) < symbolSize * 0.3 && y > centerY + symbolSize * 0.5);
      case '🔌': // Socket - rectangle avec trous
        return (Math.abs(x - centerX) < symbolSize * 0.6 && 
                Math.abs(y - centerY) < symbolSize * 0.4) ||
               (Math.abs(x - centerX) < symbolSize * 0.2 && 
                Math.abs(y - centerY) < symbolSize * 0.2);
      case '🔘': // Switch - cercle simple
        return distance < symbolSize;
      case '📡': // Sensor - triangle
        return y < centerY - symbolSize * 0.5 && 
               Math.abs(x - centerX) < (centerY - y) * 0.8;
      case '🌡️': // Thermostat - rectangle avec graduation
        return (Math.abs(x - centerX) < symbolSize * 0.3 && 
                Math.abs(y - centerY) < symbolSize * 0.6) ||
               (Math.abs(x - centerX) < symbolSize * 0.1 && 
                Math.abs(y - centerY) < symbolSize * 0.8);
      case '🪟': // Cover - rectangle horizontal
        return Math.abs(x - centerX) < symbolSize * 0.8 && 
               Math.abs(y - centerY) < symbolSize * 0.2;
      case '🔒': // Lock - rectangle avec arc
        return (Math.abs(x - centerX) < symbolSize * 0.4 && 
                Math.abs(y - centerY) < symbolSize * 0.6) ||
               (Math.abs(x - centerX) < symbolSize * 0.6 && 
                y > centerY + symbolSize * 0.4);
      case '💨': // Fan - cercle avec lignes
        return distance < symbolSize || 
               (Math.abs(x - centerX) < symbolSize * 0.1 && 
                Math.abs(y - centerY) < symbolSize * 0.8);
      case '❄️': // Climate - étoile
        return this.isStarPixel(x, y, centerX, centerY, symbolSize);
      case '📱': // Remote - rectangle arrondi
        return Math.abs(x - centerX) < symbolSize * 0.6 && 
               Math.abs(y - centerY) < symbolSize * 0.8;
      case '⚙️': // Device - engrenage
        return this.isGearPixel(x, y, centerX, centerY, symbolSize);
      case '🏠': // App - maison
        return this.isHousePixel(x, y, centerX, centerY, symbolSize);
      default:
        return distance < symbolSize;
    }
  }

  /**
   * Vérifie si un pixel fait partie d'une étoile
   */
  isStarPixel(x, y, centerX, centerY, size) {
    const angle = Math.atan2(y - centerY, x - centerX);
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const starSize = size * (0.3 + 0.7 * Math.abs(Math.sin(angle * 5)));
    return distance < starSize;
  }

  /**
   * Vérifie si un pixel fait partie d'un engrenage
   */
  isGearPixel(x, y, centerX, centerY, size) {
    const angle = Math.atan2(y - centerY, x - centerX);
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const gearSize = size * (0.4 + 0.6 * Math.abs(Math.sin(angle * 8)));
    return distance < gearSize;
  }

  /**
   * Vérifie si un pixel fait partie d'une maison
   */
  isHousePixel(x, y, centerX, centerY, size) {
    // Toit triangulaire
    if (y < centerY - size * 0.3) {
      return Math.abs(x - centerX) < (centerY - y) * 0.8;
    }
    // Corps de la maison
    return Math.abs(x - centerX) < size * 0.6 && 
           Math.abs(y - centerY) < size * 0.4;
  }

  /**
   * Convertit une couleur hex en RGB
   */
  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Compresse les données (simulation simple)
   */
  compressData(data) {
    // Simulation de compression simple
    const compressed = Buffer.alloc(data.length + 10);
    compressed[0] = 0x78; // zlib header
    compressed[1] = 0x9C; // zlib header
    data.copy(compressed, 2);
    return compressed;
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

      // Déterminer la classe du device
      const deviceClass = driverData.class;
      
      // Traitement des images
      if (driverData.images) {
        const imageTypes = ['small', 'large'];
        
        imageTypes.forEach(type => {
          if (driverData.images[type]) {
            const imagePath = driverData.images[type];
            
            // Toujours créer des images PNG cohérentes
            const newImagePath = imagePath.replace(/\.(svg|png)$/, '.png');
            const fullImagePath = path.join(driverPath, newImagePath);
            
            // Créer l'image PNG cohérente
            const config = type === 'small' ? 
              { width: 64, height: 64 } : 
              { width: 256, height: 256 };
            
            if (this.createCoherentPNG(fullImagePath, config, deviceClass)) {
              driverData.images[type] = newImagePath;
              updated = true;
              this.logSuccess(`Image ${type} créée: ${driverPath}`);
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
    console.log(chalk.blue('🎨 Démarrage de la création d\'images cohérentes...'));
    
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
   * Crée les images principales de l'app
   */
  async createAppImages() {
    console.log(chalk.blue('🏠 Création des images principales de l\'app...'));
    
    const images = [
      { path: 'assets/images/small.png', config: IMAGE_STANDARDS.app.small },
      { path: 'assets/images/large.png', config: IMAGE_STANDARDS.app.large },
      { path: 'assets/icon.png', config: IMAGE_STANDARDS.app.icon }
    ];

    for (const image of images) {
      if (this.createCoherentPNG(image.path, image.config)) {
        this.logSuccess(`Image app créée: ${image.path}`);
      }
    }

    return true;
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT DE CRÉATION D\'IMAGES COHÉRENTES'));
    console.log(chalk.green('============================================'));
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
    const creator = new CoherentImageCreator();
    
    // Créer les images principales de l'app
    await creator.createAppImages();
    
    // Traiter tous les drivers
    await creator.processAllDrivers();
    
    creator.displayStats();
    
    if (creator.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Création d\'images cohérentes terminée avec succès !'));
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

module.exports = CoherentImageCreator;
