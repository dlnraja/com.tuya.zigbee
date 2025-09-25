#!/usr/bin/env node

/**
 * Homey SDK3 Recursive Validator & Fixer
 * Validation et correction récursive complète
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class RecursiveValidator {
  constructor() {
    this.stats = {
      iterations: 0,
      max_iterations: 10,
      drivers_fixed: 0,
      images_fixed: 0,
      configs_fixed: 0,
      errors_fixed: 0,
      total_errors: 0
    };
    this.fixes = [];
    this.errors = [];
  }

  /**
   * Validation et correction récursive complète
   */
  async validateAndFixRecursively() {
    console.log(chalk.blue('🚀 Démarrage validation et correction récursive Homey SDK3...'));
    
    let hasErrors = true;
    
    while (hasErrors && this.stats.iterations < this.stats.max_iterations) {
      this.stats.iterations++;
      console.log(chalk.yellow(`\n🔄 ITÉRATION ${this.stats.iterations}/${this.stats.max_iterations}`));
      
      // Réinitialiser les erreurs pour cette itération
      this.errors = [];
      
      // Validation complète
      this.validateAppStructure();
      this.validateAllDrivers();
      this.validateImages();
      this.validateConfigs();
      
      // Si aucune erreur, on a terminé
      if (this.errors.length === 0) {
        hasErrors = false;
        console.log(chalk.green('✅ Aucune erreur trouvée - validation réussie !'));
        break;
      }
      
      // Correction des erreurs
      console.log(chalk.blue(`🔧 Correction de ${this.errors.length} erreur(s)...`));
      await this.fixAllErrors();
      
      // Attendre un peu avant la prochaine itération
      await this.sleep(1000);
    }
    
    if (this.stats.iterations >= this.stats.max_iterations) {
      console.log(chalk.red('⚠️  Nombre maximum d\'itérations atteint'));
    }
    
    this.displayFinalReport();
  }

  /**
   * Validation de la structure de l'app
   */
  validateAppStructure() {
    console.log(chalk.blue('🏠 Validation structure de l\'app...'));
    
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
      }
    });

    // Validation spécifique app.json
    if (fs.existsSync('app.json')) {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        // Vérifier les propriétés requises
        const requiredProps = ['id', 'version', 'compatibility', 'category', 'permissions'];
        requiredProps.forEach(prop => {
          if (!appJson[prop]) {
            this.addError(`app.json: propriété manquante: ${prop}`);
          }
        });

        // Vérifier la compatibilité SDK3
        if (appJson.compatibility && !appJson.compatibility.includes('6.0.0')) {
          this.addError('app.json: compatibilité SDK3 requise (>=6.0.0)');
        }

        // Vérifier les images
        if (appJson.images) {
          if (appJson.images.small && !appJson.images.small.includes('assets/small.png')) {
            this.addError('app.json: chemin image small incorrect');
          }
          if (appJson.images.large && !appJson.images.large.includes('assets/large.png')) {
            this.addError('app.json: chemin image large incorrect');
          }
        }
      } catch (error) {
        this.addError(`app.json: erreur de parsing: ${error.message}`);
      }
    }
  }

  /**
   * Validation de tous les drivers
   */
  validateAllDrivers() {
    console.log(chalk.blue('🔍 Validation de tous les drivers...'));
    
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) {
      this.addError('Dossier drivers non trouvé');
      return;
    }

    const driverDirs = fs.readdirSync(driversDir)
      .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

    console.log(chalk.yellow(`📁 ${driverDirs.length} drivers trouvés`));

    driverDirs.forEach(driverDir => {
      this.validateDriver(path.join(driversDir, driverDir), driverDir);
    });
  }

  /**
   * Validation d'un driver individuel
   */
  validateDriver(driverPath, driverName) {
    const driverComposePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(driverComposePath)) {
      this.addError(`Driver ${driverName}: driver.compose.json manquant`);
      return;
    }

    try {
      const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
      
      // Validation de la classe
      if (!driverData.class) {
        this.addError(`Driver ${driverName}: classe manquante`);
      } else {
        const validClasses = [
          'light', 'switch', 'sensor', 'thermostat', 'cover', 'climate',
          'button', 'remote', 'lock', 'alarm', 'fan', 'heater', 'curtain',
          'socket', 'device' // Classes supplémentaires supportées
        ];
        
        if (!validClasses.includes(driverData.class)) {
          this.addError(`Driver ${driverName}: classe non supportée: ${driverData.class}`);
        }
      }

      // Validation des images
      if (driverData.images) {
        if (driverData.images.small) {
          const smallImagePath = path.join(driverPath, driverData.images.small);
          if (!fs.existsSync(smallImagePath)) {
            this.addError(`Driver ${driverName}: image small manquante: ${driverData.images.small}`);
          }
        }
        
        if (driverData.images.large) {
          const largeImagePath = path.join(driverPath, driverData.images.large);
          if (!fs.existsSync(largeImagePath)) {
            this.addError(`Driver ${driverName}: image large manquante: ${driverData.images.large}`);
          }
        }
      } else {
        this.addError(`Driver ${driverName}: section images manquante`);
      }

      // Validation des capacités
      if (driverData.capabilities) {
        if (!Array.isArray(driverData.capabilities)) {
          this.addError(`Driver ${driverName}: capabilities doit être un tableau`);
        }
      }

      // Validation Zigbee
      if (driverData.zigbee) {
        if (driverData.zigbee.clusters) {
          if (!Array.isArray(driverData.zigbee.clusters)) {
            this.addError(`Driver ${driverName}: clusters Zigbee doit être un tableau`);
          }
        }
      }

    } catch (error) {
      this.addError(`Driver ${driverName}: erreur de parsing: ${error.message}`);
    }
  }

  /**
   * Validation des images
   */
  validateImages() {
    console.log(chalk.blue('🖼️  Validation des images...'));
    
    // Vérifier que les images principales existent et sont accessibles
    const mainImages = [
      'assets/small.png',
      'assets/large.png',
      'assets/icon.png'
    ];

    mainImages.forEach(image => {
      if (!fs.existsSync(image)) {
        this.addError(`Image principale manquante: ${image}`);
      }
    });

    // Vérifier les images des drivers
    const driversDir = 'drivers';
    if (fs.existsSync(driversDir)) {
      const driverDirs = fs.readdirSync(driversDir)
        .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

      driverDirs.forEach(driverDir => {
        const driverPath = path.join(driversDir, driverDir);
        const driverComposePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(driverComposePath)) {
          try {
            const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
            
            if (driverData.images) {
              if (driverData.images.small) {
                const smallImagePath = path.join(driverPath, driverData.images.small);
                if (!fs.existsSync(smallImagePath)) {
                  this.addError(`Driver ${driverDir}: image small manquante: ${driverData.images.small}`);
                }
              }
              
              if (driverData.images.large) {
                const largeImagePath = path.join(driverPath, driverData.images.large);
                if (!fs.existsSync(largeImagePath)) {
                  this.addError(`Driver ${driverDir}: image large manquante: ${driverData.images.large}`);
                }
              }
            }
          } catch (error) {
            // Ignorer les erreurs de parsing pour cette validation
          }
        }
      });
    }
  }

  /**
   * Validation des configurations
   */
  validateConfigs() {
    console.log(chalk.blue('⚙️  Validation des configurations...'));
    
    // Validation package.json
    if (fs.existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Vérifier la section homey
        if (!packageJson.homey) {
          this.addError('package.json: section homey manquante');
        } else {
          if (!packageJson.homey.min || !packageJson.homey.max) {
            this.addError('package.json: compatibilité homey incomplète');
          }
        }

        // Vérifier les dépendances
        if (!packageJson.dependencies || !packageJson.dependencies.homey) {
          this.addError('package.json: dépendance homey manquante');
        }
      } catch (error) {
        this.addError(`package.json: erreur de parsing: ${error.message}`);
      }
    }

    // Validation compose.json
    if (fs.existsSync('.homeycompose/compose.json')) {
      try {
        const composeJson = JSON.parse(fs.readFileSync('.homeycompose/compose.json', 'utf8'));
        
        if (!composeJson.platforms) {
          this.addError('.homeycompose/compose.json: section platforms manquante');
        }
      } catch (error) {
        this.addError(`.homeycompose/compose.json: erreur de parsing: ${error.message}`);
      }
    }
  }

  /**
   * Correction de toutes les erreurs
   */
  async fixAllErrors() {
    for (const error of this.errors) {
      await this.fixError(error);
    }
  }

  /**
   * Correction d'une erreur spécifique
   */
  async fixError(error) {
    console.log(chalk.blue(`🔧 Correction: ${error}`));
    
    if (error.includes('Asset requis manquant')) {
      await this.fixMissingAsset(error);
    } else if (error.includes('image small manquante') || error.includes('image large manquante')) {
      await this.fixMissingDriverImage(error);
    } else if (error.includes('classe non supportée')) {
      await this.fixInvalidDriverClass(error);
    } else if (error.includes('app.json: chemin image')) {
      await this.fixAppJsonImagePaths(error);
    } else if (error.includes('compatibilité SDK3')) {
      await this.fixSDK3Compatibility(error);
    } else {
      console.log(chalk.yellow(`⚠️  Erreur non corrigée automatiquement: ${error}`));
    }
  }

  /**
   * Correction d'un asset manquant
   */
  async fixMissingAsset(error) {
    const assetMatch = error.match(/Asset requis manquant: (.+)/);
    if (assetMatch) {
      const assetPath = assetMatch[1];
      
      if (assetPath.includes('assets/small.png') || assetPath.includes('assets/large.png')) {
        // Copier depuis assets/images/
        const sourcePath = assetPath.replace('assets/', 'assets/images/');
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, assetPath);
          console.log(chalk.green(`✅ Asset copié: ${sourcePath} → ${assetPath}`));
          this.stats.images_fixed++;
          this.fixes.push(`Asset copié: ${assetPath}`);
        }
      }
    }
  }

  /**
   * Correction d'une image de driver manquante
   */
  async fixMissingDriverImage(error) {
    const driverMatch = error.match(/Driver (.+): image (.+) manquante: (.+)/);
    if (driverMatch) {
      const driverName = driverMatch[1];
      const imageType = driverMatch[2];
      const imagePath = driverMatch[3];
      
      const driverPath = path.join('drivers', driverName);
      const fullImagePath = path.join(driverPath, imagePath);
      
      // Créer une image par défaut si elle n'existe pas
      if (!fs.existsSync(fullImagePath)) {
        await this.createDefaultDriverImage(driverPath, imageType);
        this.stats.images_fixed++;
        this.fixes.push(`Image ${imageType} créée pour ${driverName}`);
      }
    }
  }

  /**
   * Correction d'une classe de driver invalide
   */
  async fixInvalidDriverClass(error) {
    const driverMatch = error.match(/Driver (.+): classe non supportée: (.+)/);
    if (driverMatch) {
      const driverName = driverMatch[1];
      const invalidClass = driverMatch[2];
      
      // Mapper les classes invalides vers des classes valides
      const classMapping = {
        'climate': 'thermostat',
        'socket': 'switch',
        'device': 'switch'
      };
      
      if (classMapping[invalidClass]) {
        const driverPath = path.join('drivers', driverName);
        const driverComposePath = path.join(driverPath, 'driver.compose.json');
        
        if (fs.existsSync(driverComposePath)) {
          try {
            const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
            driverData.class = classMapping[invalidClass];
            
            fs.writeFileSync(driverComposePath, JSON.stringify(driverData, null, 2));
            console.log(chalk.green(`✅ Classe corrigée: ${driverName} ${invalidClass} → ${classMapping[invalidClass]}`));
            this.stats.drivers_fixed++;
            this.fixes.push(`Classe corrigée: ${driverName}`);
          } catch (error) {
            console.log(chalk.red(`❌ Erreur correction classe ${driverName}: ${error.message}`));
          }
        }
      }
    }
  }

  /**
   * Correction des chemins d'images dans app.json
   */
  async fixAppJsonImagePaths(error) {
    if (fs.existsSync('app.json')) {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        if (appJson.images) {
          if (appJson.images.small && !appJson.images.small.includes('assets/small.png')) {
            appJson.images.small = 'assets/small.png';
          }
          if (appJson.images.large && !appJson.images.large.includes('assets/large.png')) {
            appJson.images.large = 'assets/large.png';
          }
          
          fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
          console.log(chalk.green('✅ Chemins d\'images corrigés dans app.json'));
          this.stats.configs_fixed++;
          this.fixes.push('Chemins d\'images app.json corrigés');
        }
      } catch (error) {
        console.log(chalk.red(`❌ Erreur correction app.json: ${error.message}`));
      }
    }
  }

  /**
   * Correction de la compatibilité SDK3
   */
  async fixSDK3Compatibility(error) {
    if (fs.existsSync('app.json')) {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        if (!appJson.compatibility || !appJson.compatibility.includes('6.0.0')) {
          appJson.compatibility = '>=6.0.0';
          appJson.sdk = 3;
          
          fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
          console.log(chalk.green('✅ Compatibilité SDK3 corrigée dans app.json'));
          this.stats.configs_fixed++;
          this.fixes.push('Compatibilité SDK3 corrigée');
        }
      } catch (error) {
        console.log(chalk.red(`❌ Erreur correction compatibilité: ${error.message}`));
      }
    }
  }

  /**
   * Création d'une image de driver par défaut
   */
  async createDefaultDriverImage(driverPath, imageType) {
    // Créer une image PNG simple 1x1 transparente
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, // bit depth
      0x06, // color type (RGBA)
      0x00, // compression
      0x00, // filter
      0x00, // interlace
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, // compressed data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    const imagePath = path.join(driverPath, `${imageType}.png`);
    fs.writeFileSync(imagePath, pngBuffer);
    
    // Mettre à jour le driver.compose.json
    const driverComposePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(driverComposePath)) {
      try {
        const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
        if (!driverData.images) driverData.images = {};
        driverData.images[imageType] = `${imageType}.png`;
        
        fs.writeFileSync(driverComposePath, JSON.stringify(driverData, null, 2));
      } catch (error) {
        // Ignorer les erreurs de mise à jour
      }
    }
    
    console.log(chalk.green(`✅ Image ${imageType} créée pour ${path.basename(driverPath)}`));
  }

  /**
   * Ajoute une erreur
   */
  addError(message) {
    this.errors.push(message);
    this.stats.total_errors++;
  }

  /**
   * Affichage du rapport final
   */
  displayFinalReport() {
    console.log(chalk.green('\n📊 RAPPORT FINAL DE VALIDATION RÉCURSIVE'));
    console.log(chalk.green('=========================================='));
    console.log(chalk.blue(`Itérations: ${this.stats.iterations}`));
    console.log(chalk.green(`Drivers corrigés: ${this.stats.drivers_fixed}`));
    console.log(chalk.green(`Images corrigées: ${this.stats.images_fixed}`));
    console.log(chalk.green(`Configs corrigées: ${this.stats.configs_fixed}`));
    console.log(chalk.blue(`Total erreurs traitées: ${this.stats.total_errors}`));
    
    if (this.fixes.length > 0) {
      console.log(chalk.green('\n✅ CORRECTIONS APPLIQUÉES:'));
      this.fixes.forEach(fix => {
        console.log(chalk.green(`  • ${fix}`));
      });
    }
    
    if (this.errors.length === 0) {
      console.log(chalk.green('\n🎉 VALIDATION COMPLÈTE RÉUSSIE !'));
      console.log(chalk.blue('📱 Votre app Homey SDK3 est maintenant prête !'));
    } else {
      console.log(chalk.red(`\n⚠️  ${this.errors.length} erreur(s) persistent`));
      this.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }

  /**
   * Pause entre les itérations
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exécution principale
async function main() {
  try {
    const validator = new RecursiveValidator();
    await validator.validateAndFixRecursively();
    
    if (validator.errors.length === 0) {
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

module.exports = RecursiveValidator;
