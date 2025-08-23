#!/usr/bin/env node

/**
 * Homey SDK3 Final Test Script
 * Test complet et final de l'app
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class FinalTester {
  constructor() {
    this.results = {
      structure: { passed: false, errors: [] },
      drivers: { passed: false, errors: [] },
      images: { passed: false, errors: [] },
      configs: { passed: false, errors: [] },
      build: { passed: false, errors: [] },
      sdk3: { passed: false, errors: [] }
    };
    this.stats = {
      total_tests: 0,
      passed_tests: 0,
      failed_tests: 0
    };
  }

  /**
   * Exécution de tous les tests
   */
  async runAllTests() {
    console.log(chalk.blue('🧪 DÉMARRAGE DES TESTS FINAUX HOMEY SDK3...'));
    console.log(chalk.blue('============================================'));
    
    // Test 1: Structure de l'app
    await this.testAppStructure();
    
    // Test 2: Validation des drivers
    await this.testDrivers();
    
    // Test 3: Validation des images
    await this.testImages();
    
    // Test 4: Validation des configurations
    await this.testConfigurations();
    
    // Test 5: Validation du build
    await this.testBuild();
    
    // Test 6: Validation SDK3
    await this.testSDK3Compliance();
    
    // Affichage du rapport final
    this.displayFinalReport();
  }

  /**
   * Test de la structure de l'app
   */
  async testAppStructure() {
    console.log(chalk.blue('\n🏠 TEST 1: Structure de l\'app...'));
    this.stats.total_tests++;
    
    const requiredFiles = [
      'app.json',
      'package.json',
      '.homeycompose/compose.json',
      'README.md'
    ];

    const requiredAssets = [
      'assets/small.png',
      'assets/large.png',
      'assets/icon.png'
    ];

    let hasErrors = false;

    // Vérification des fichiers requis
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        this.results.structure.errors.push(`Fichier manquant: ${file}`);
        hasErrors = true;
      }
    });

    // Vérification des assets
    requiredAssets.forEach(asset => {
      if (!fs.existsSync(asset)) {
        this.results.structure.errors.push(`Asset manquant: ${asset}`);
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      this.results.structure.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green('✅ Structure de l\'app: PASSÉ'));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Structure de l\'app: ÉCHOUÉ'));
      this.results.structure.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }

  /**
   * Test des drivers
   */
  async testDrivers() {
    console.log(chalk.blue('\n🔍 TEST 2: Validation des drivers...'));
    this.stats.total_tests++;
    
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) {
      this.results.drivers.errors.push('Dossier drivers non trouvé');
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Drivers: ÉCHOUÉ'));
      return;
    }

    const driverDirs = fs.readdirSync(driversDir)
      .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

    console.log(chalk.yellow(`📁 ${driverDirs.length} drivers trouvés`));

    let hasErrors = false;
    let validDrivers = 0;

    driverDirs.forEach(driverDir => {
      const driverPath = path.join(driversDir, driverDir);
      const driverComposePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(driverComposePath)) {
        this.results.drivers.errors.push(`Driver ${driverDir}: driver.compose.json manquant`);
        hasErrors = true;
        return;
      }

      try {
        const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
        
        // Validation de base
        if (!driverData.class) {
          this.results.drivers.errors.push(`Driver ${driverDir}: classe manquante`);
          hasErrors = true;
        } else {
          const validClasses = [
            'light', 'switch', 'sensor', 'thermostat', 'cover', 'climate',
            'button', 'remote', 'lock', 'alarm', 'fan', 'heater', 'curtain',
            'socket', 'device'
          ];
          
          if (!validClasses.includes(driverData.class)) {
            this.results.drivers.errors.push(`Driver ${driverDir}: classe non supportée: ${driverData.class}`);
            hasErrors = true;
          } else {
            validDrivers++;
          }
        }

        // Validation des images
        if (driverData.images) {
          if (driverData.images.small) {
            const smallImagePath = path.join(driverPath, driverData.images.small);
            if (!fs.existsSync(smallImagePath)) {
              this.results.drivers.errors.push(`Driver ${driverDir}: image small manquante`);
              hasErrors = true;
            }
          }
          
          if (driverData.images.large) {
            const largeImagePath = path.join(driverPath, driverData.images.large);
            if (!fs.existsSync(largeImagePath)) {
              this.results.drivers.errors.push(`Driver ${driverDir}: image large manquante`);
              hasErrors = true;
            }
          }
        } else {
          this.results.drivers.errors.push(`Driver ${driverDir}: section images manquante`);
          hasErrors = true;
        }

      } catch (error) {
        this.results.drivers.errors.push(`Driver ${driverDir}: erreur de parsing: ${error.message}`);
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      this.results.drivers.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green(`✅ Drivers: PASSÉ (${validDrivers}/${driverDirs.length})`));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Drivers: ÉCHOUÉ'));
      this.results.drivers.errors.slice(0, 5).forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
      if (this.results.drivers.errors.length > 5) {
        console.log(chalk.yellow(`  ... et ${this.results.drivers.errors.length - 5} autres erreurs`));
      }
    }
  }

  /**
   * Test des images
   */
  async testImages() {
    console.log(chalk.blue('\n🖼️  TEST 3: Validation des images...'));
    this.stats.total_tests++;
    
    let hasErrors = false;
    let totalImages = 0;
    let validImages = 0;

    // Test des images principales
    const mainImages = [
      'assets/small.png',
      'assets/large.png',
      'assets/icon.png'
    ];

    mainImages.forEach(image => {
      totalImages++;
      if (fs.existsSync(image)) {
        validImages++;
      } else {
        this.results.images.errors.push(`Image principale manquante: ${image}`);
        hasErrors = true;
      }
    });

    // Test des images des drivers
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
                totalImages++;
                const smallImagePath = path.join(driverPath, driverData.images.small);
                if (fs.existsSync(smallImagePath)) {
                  validImages++;
                } else {
                  this.results.images.errors.push(`Driver ${driverDir}: image small manquante`);
                  hasErrors = true;
                }
              }
              
              if (driverData.images.large) {
                totalImages++;
                const largeImagePath = path.join(driverPath, driverData.images.large);
                if (fs.existsSync(largeImagePath)) {
                  validImages++;
                } else {
                  this.results.images.errors.push(`Driver ${driverDir}: image large manquante`);
                  hasErrors = true;
                }
              }
            }
          } catch (error) {
            // Ignorer les erreurs de parsing
          }
        }
      });
    }

    if (!hasErrors) {
      this.results.images.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green(`✅ Images: PASSÉ (${validImages}/${totalImages})`));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Images: ÉCHOUÉ'));
      this.results.images.errors.slice(0, 5).forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
      if (this.results.images.errors.length > 5) {
        console.log(chalk.yellow(`  ... et ${this.results.images.errors.length - 5} autres erreurs`));
      }
    }
  }

  /**
   * Test des configurations
   */
  async testConfigurations() {
    console.log(chalk.blue('\n⚙️  TEST 4: Validation des configurations...'));
    this.stats.total_tests++;
    
    let hasErrors = false;

    // Test app.json
    if (fs.existsSync('app.json')) {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        const requiredProps = ['id', 'version', 'compatibility', 'category', 'permissions'];
        requiredProps.forEach(prop => {
          if (!appJson[prop]) {
            this.results.configs.errors.push(`app.json: propriété manquante: ${prop}`);
            hasErrors = true;
          }
        });

        // Vérifier la compatibilité SDK3
        if (appJson.compatibility && !appJson.compatibility.includes('6.0.0')) {
          this.results.configs.errors.push('app.json: compatibilité SDK3 requise');
          hasErrors = true;
        }

        // Vérifier les images
        if (appJson.images) {
          if (appJson.images.small && !appJson.images.small.includes('assets/small.png')) {
            this.results.configs.errors.push('app.json: chemin image small incorrect');
            hasErrors = true;
          }
          if (appJson.images.large && !appJson.images.large.includes('assets/large.png')) {
            this.results.configs.errors.push('app.json: chemin image large incorrect');
            hasErrors = true;
          }
        }
      } catch (error) {
        this.results.configs.errors.push(`app.json: erreur de parsing: ${error.message}`);
        hasErrors = true;
      }
    } else {
      this.results.configs.errors.push('app.json manquant');
      hasErrors = true;
    }

    // Test package.json
    if (fs.existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (!packageJson.homey) {
          this.results.configs.errors.push('package.json: section homey manquante');
          hasErrors = true;
        } else {
          if (!packageJson.homey.min || !packageJson.homey.max) {
            this.results.configs.errors.push('package.json: compatibilité homey incomplète');
            hasErrors = true;
          }
        }

        if (!packageJson.dependencies || !packageJson.dependencies.homey) {
          this.results.configs.errors.push('package.json: dépendance homey manquante');
          hasErrors = true;
        }
      } catch (error) {
        this.results.configs.errors.push(`package.json: erreur de parsing: ${error.message}`);
        hasErrors = true;
      }
    } else {
      this.results.configs.errors.push('package.json manquant');
      hasErrors = true;
    }

    if (!hasErrors) {
      this.results.configs.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green('✅ Configurations: PASSÉ'));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Configurations: ÉCHOUÉ'));
      this.results.configs.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }

  /**
   * Test du build
   */
  async testBuild() {
    console.log(chalk.blue('\n🏗️  TEST 5: Validation du build...'));
    this.stats.total_tests++;
    
    const buildDir = '.homeybuild';
    if (!fs.existsSync(buildDir)) {
      this.results.build.errors.push('Dossier de build .homeybuild non trouvé');
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Build: ÉCHOUÉ'));
      return;
    }

    let hasErrors = false;

    // Vérifier les fichiers de build
    const requiredBuildFiles = [
      'app.json',
      'package.json',
      'assets/small.png',
      'assets/large.png',
      'assets/icon.png'
    ];

    requiredBuildFiles.forEach(file => {
      const buildPath = path.join(buildDir, file);
      if (!fs.existsSync(buildPath)) {
        this.results.build.errors.push(`Fichier de build manquant: ${file}`);
        hasErrors = true;
      }
    });

    // Vérifier les drivers de build
    const buildDriversDir = path.join(buildDir, 'drivers');
    if (!fs.existsSync(buildDriversDir)) {
      this.results.build.errors.push('Dossier drivers de build manquant');
      hasErrors = true;
    } else {
      const buildDriverDirs = fs.readdirSync(buildDriversDir)
        .filter(item => fs.statSync(path.join(buildDriversDir, item)).isDirectory());
      
      if (buildDriverDirs.length === 0) {
        this.results.build.errors.push('Aucun driver dans le build');
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      this.results.build.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green('✅ Build: PASSÉ'));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Build: ÉCHOUÉ'));
      this.results.build.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }

  /**
   * Test de conformité SDK3
   */
  async testSDK3Compliance() {
    console.log(chalk.blue('\n🚀 TEST 6: Conformité SDK3...'));
    this.stats.total_tests++;
    
    let hasErrors = false;

    // Vérifier la version SDK3
    if (fs.existsSync('app.json')) {
      try {
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        
        if (!appJson.compatibility || !appJson.compatibility.includes('6.0.0')) {
          this.results.sdk3.errors.push('Compatibilité SDK3 manquante');
          hasErrors = true;
        }

        if (!appJson.sdk || appJson.sdk !== 3) {
          this.results.sdk3.errors.push('Version SDK3 non spécifiée');
          hasErrors = true;
        }
      } catch (error) {
        this.results.sdk3.errors.push(`Erreur vérification SDK3: ${error.message}`);
        hasErrors = true;
      }
    }

    // Vérifier package.json
    if (fs.existsSync('package.json')) {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (!packageJson.homey || !packageJson.homey.min || !packageJson.homey.max) {
          this.results.sdk3.errors.push('Configuration homey incomplète');
          hasErrors = true;
        }

        if (!packageJson.dependencies || !packageJson.dependencies.homey) {
          this.results.sdk3.errors.push('Dépendance homey manquante');
          hasErrors = true;
        }
      } catch (error) {
        this.results.sdk3.errors.push(`Erreur vérification package.json: ${error.message}`);
        hasErrors = true;
      }
    }

    if (!hasErrors) {
      this.results.sdk3.passed = true;
      this.stats.passed_tests++;
      console.log(chalk.green('✅ Conformité SDK3: PASSÉ'));
    } else {
      this.stats.failed_tests++;
      console.log(chalk.red('❌ Conformité SDK3: ÉCHOUÉ'));
      this.results.sdk3.errors.forEach(error => {
        console.log(chalk.red(`  • ${error}`));
      });
    }
  }

  /**
   * Affichage du rapport final
   */
  displayFinalReport() {
    console.log(chalk.green('\n📊 RAPPORT FINAL DES TESTS HOMEY SDK3'));
    console.log(chalk.green('========================================'));
    
    // Résumé des tests
    console.log(chalk.blue(`\n📈 RÉSUMÉ DES TESTS:`));
    console.log(chalk.blue(`Tests totaux: ${this.stats.total_tests}`));
    console.log(chalk.green(`Tests réussis: ${this.stats.passed_tests}`));
    console.log(chalk.red(`Tests échoués: ${this.stats.failed_tests}`));
    
    const successRate = ((this.stats.passed_tests / this.stats.total_tests) * 100).toFixed(1);
    console.log(chalk.blue(`Taux de succès: ${successRate}%`));
    
    // Détail des tests
    console.log(chalk.blue(`\n🔍 DÉTAIL DES TESTS:`));
    
    const testNames = [
      { key: 'structure', name: 'Structure de l\'app' },
      { key: 'drivers', name: 'Validation des drivers' },
      { key: 'images', name: 'Validation des images' },
      { key: 'configs', name: 'Validation des configurations' },
      { key: 'build', name: 'Validation du build' },
      { key: 'sdk3', name: 'Conformité SDK3' }
    ];

    testNames.forEach(test => {
      const result = this.results[test.key];
      if (result.passed) {
        console.log(chalk.green(`✅ ${test.name}: PASSÉ`));
      } else {
        console.log(chalk.red(`❌ ${test.name}: ÉCHOUÉ`));
        if (result.errors.length > 0) {
          result.errors.slice(0, 3).forEach(error => {
            console.log(chalk.red(`  • ${error}`));
          });
          if (result.errors.length > 3) {
            console.log(chalk.yellow(`  ... et ${result.errors.length - 3} autres erreurs`));
          }
        }
      }
    });
    
    // Conclusion
    if (this.stats.failed_tests === 0) {
      console.log(chalk.green('\n🎉 FÉLICITATIONS ! TOUS LES TESTS SONT PASSÉS !'));
      console.log(chalk.blue('📱 Votre app Homey SDK3 est parfaitement validée et prête !'));
      console.log(chalk.yellow('🚀 Vous pouvez maintenant publier sur le Homey Store !'));
    } else {
      console.log(chalk.red(`\n⚠️  ${this.stats.failed_tests} test(s) ont échoué.`));
      console.log(chalk.yellow('🔧 Veuillez corriger les erreurs avant de continuer.'));
    }
  }
}

// Exécution principale
async function main() {
  try {
    const tester = new FinalTester();
    await tester.runAllTests();
    
    if (tester.stats.failed_tests === 0) {
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

module.exports = FinalTester;
